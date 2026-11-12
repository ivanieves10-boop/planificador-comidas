import { openDB, DBSchema } from 'idb';
import { AppConfig, PlanificacionDia, PlatoCatalogo, Ingrediente, ProductoCompradoRecord, ProductoManual } from '../types';

interface PlanificadorDB extends DBSchema {
  configuracion: {
    key: string;
    value: AppConfig;
  };
  planificacion: {
    key: string;
    value: PlanificacionDia;
  };
  platos: {
    key: string;
    value: PlatoCatalogo;
  };
  platosPredeterminadosExcluidos: {
    key: string;
    value: { nombre: string };
  };
  ingredientes: {
    key: string;
    value: Ingrediente;
    indexes: { 'by-platoId': string };
  };
  productosComprados: {
    key: string;
    value: ProductoCompradoRecord;
  };
  productosManuales: {
    key: string;
    value: ProductoManual;
    indexes: {
      'inicioSemana': string;
      'categoria': string;
      'nombre': string;
    };
  };
}

export const CATALOGO_INICIAL_NOMBRES = [
  "Arroz", "Crema de calabacín", "Ensalada", "Fuera de casa",
  "Hamburguesas", "Pescado con verduras", "Pizza casera",
  "Pollo al horno", "Pollo asado", "Sopa", "Tortilla y ensalada"
];

export async function inicializarCatalogoPredeterminado(db: any) {
  const tx = db.transaction(['platos', 'platosPredeterminadosExcluidos'], 'readwrite');
  const platosStore = tx.objectStore('platos');
  const excluidosStore = tx.objectStore('platosPredeterminadosExcluidos');

  const allPlatos = await platosStore.getAll();
  const allExcluidos = await excluidosStore.getAll();
  const nombresExcluidos = new Set(allExcluidos.map((e: any) => e.nombre.toLowerCase().trim()));
  const nombresExistentes = new Set(allPlatos.map((p: any) => p.nombre.toLowerCase().trim()));

  const now = new Date().toISOString();

  for (const nombreInit of CATALOGO_INICIAL_NOMBRES) {
    const norm = nombreInit.toLowerCase().trim();
    if (!nombresExcluidos.has(norm) && !nombresExistentes.has(norm)) {
      await platosStore.put({
        id: crypto.randomUUID(),
        nombre: nombreInit,
        predeterminado: true,
        creadoEn: now,
        actualizadoEn: now
      });
      nombresExistentes.add(norm);
    }
  }
  await tx.done;
}

export async function initDB() {
  const db = await openDB<PlanificadorDB>('PlanificadorComidasDB', 6, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains('configuracion')) {
        db.createObjectStore('configuracion', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('planificacion')) {
        db.createObjectStore('planificacion', { keyPath: 'fecha' });
      }
      if (!db.objectStoreNames.contains('platos')) {
        db.createObjectStore('platos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('platosPredeterminadosExcluidos')) {
        db.createObjectStore('platosPredeterminadosExcluidos', { keyPath: 'nombre' });
      }
      if (!db.objectStoreNames.contains('ingredientes')) {
        const store = db.createObjectStore('ingredientes', { keyPath: 'id' });
        store.createIndex('by-platoId', 'platoId');
      } else {
        const store = transaction.objectStore('ingredientes');
        if (!store.indexNames.contains('by-platoId')) {
          store.createIndex('by-platoId', 'platoId');
        }
      }
      if (!db.objectStoreNames.contains('productosComprados')) {
        db.createObjectStore('productosComprados', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('productosManuales')) {
        const store = db.createObjectStore('productosManuales', { keyPath: 'id' });
        store.createIndex('inicioSemana', 'inicioSemana');
        store.createIndex('categoria', 'categoria');
        store.createIndex('nombre', 'nombre');
      } else {
        const store = transaction.objectStore('productosManuales');
        if (!store.indexNames.contains('inicioSemana')) {
          store.createIndex('inicioSemana', 'inicioSemana');
        }
        if (!store.indexNames.contains('categoria')) {
          store.createIndex('categoria', 'categoria');
        }
        if (!store.indexNames.contains('nombre')) {
          store.createIndex('nombre', 'nombre');
        }
      }
    },
  });

  const config = await db.get('configuracion', 'app_config');
  if (!config) {
    await db.put('configuracion', { id: 'app_config', primerDiaSemana: 'MONDAY' });
  }

  await inicializarCatalogoPredeterminado(db);

  return db;
}

// Helpers de Ingredientes
export async function obtenerIngredientesPorPlato(db: any, platoId: string): Promise<Ingrediente[]> {
  const index = db.transaction('ingredientes', 'readonly').store.index('by-platoId');
  const items = await index.getAll(platoId);
  return items.sort((a: Ingrediente, b: Ingrediente) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function añadirIngrediente(db: any, ingrediente: Ingrediente) {
  await db.put('ingredientes', ingrediente);
}

export async function actualizarIngrediente(db: any, ingrediente: Ingrediente) {
  await db.put('ingredientes', ingrediente);
}

export async function eliminarIngrediente(db: any, id: string) {
  await db.delete('ingredientes', id);
}

export async function existeIngredienteDuplicado(
  db: any,
  platoId: string,
  nombre: string,
  unidad: string,
  ingredienteIdExcluir?: string
): Promise<boolean> {
  const ingredientes = await obtenerIngredientesPorPlato(db, platoId);
  const nombreNorm = nombre.trim().toLowerCase();
  const unidadNorm = unidad.trim().toLowerCase();

  return ingredientes.some(ing => {
    if (ingredienteIdExcluir && ing.id === ingredienteIdExcluir) return false;
    return ing.nombre.trim().toLowerCase() === nombreNorm && ing.unidad.trim().toLowerCase() === unidadNorm;
  });
}

// Helpers de Productos Manuales
export async function obtenerProductosManuales(db: any, inicioSemana: string): Promise<ProductoManual[]> {
  const index = db.transaction('productosManuales', 'readonly').store.index('inicioSemana');
  const items = await index.getAll(inicioSemana);
  return items.sort((a: ProductoManual, b: ProductoManual) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function añadirProductoManual(db: any, producto: ProductoManual) {
  await db.put('productosManuales', producto);
}

export async function actualizarProductoManual(db: any, producto: ProductoManual) {
  await db.put('productosManuales', producto);
}

export async function eliminarProductoManual(db: any, id: string) {
  await db.delete('productosManuales', id);
}

export async function existeProductoManualDuplicado(
  db: any,
  inicioSemana: string,
  nombre: string,
  unidad: string,
  idExcluir?: string
): Promise<boolean> {
  const productos = await obtenerProductosManuales(db, inicioSemana);
  const nombreNorm = nombre.trim().toLowerCase();
  const unidadNorm = unidad.trim().toLowerCase();

  return productos.some(p => {
    if (idExcluir && p.id === idExcluir) return false;
    return p.nombre.trim().toLowerCase() === nombreNorm && p.unidad.trim().toLowerCase() === unidadNorm;
  });
}

// Helpers de Compra y Catálogo
export async function obtenerPlatosCatalogo(db: any): Promise<PlatoCatalogo[]> {
  const store = db.transaction('platos', 'readonly').objectStore('platos');
  const excluidosStore = db.transaction('platosPredeterminadosExcluidos', 'readonly').objectStore('platosPredeterminadosExcluidos');
  const [allPlatos, allExcluidos] = await Promise.all([store.getAll(), excluidosStore.getAll()]);
  const nombresExcluidos = new Set(allExcluidos.map((e: any) => e.nombre.toLowerCase().trim()));
  return allPlatos.filter((p: PlatoCatalogo) => !p.predeterminado || !nombresExcluidos.has(p.nombre.toLowerCase().trim()));
}

export function resolverPlatoPlanificado(nombrePlato: string, catalogo: PlatoCatalogo[]): PlatoCatalogo | undefined {
  if (!nombrePlato) return undefined;
  const norm = nombrePlato.toLowerCase().trim().replace(/\s+/g, ' ');
  if (norm === 'fuera de casa' || norm === '') return undefined;

  let match = catalogo.find(p => p.nombre.toLowerCase().trim().replace(/\s+/g, ' ') === norm);
  if (match) return match;

  match = catalogo.find(p => p.nombre.toLowerCase().trim().replace(/\s+/g, ' ').includes(norm) || norm.includes(p.nombre.toLowerCase().trim().replace(/\s+/g, ' ')));
  return match;
}

export async function obtenerCompradosSemana(db: any, inicioSemanaIso: string): Promise<Map<string, boolean>> {
  const store = db.transaction('productosComprados', 'readonly').objectStore('productosComprados');
  const all = await store.getAll();
  const map = new Map<string, boolean>();
  for (const item of all) {
    if (item.id.startsWith(inicioSemanaIso)) {
      map.set(item.id, item.comprado);
    }
  }
  return map;
}

export async function guardarComprado(db: any, id: string, inicioSemana: string, comprado: boolean) {
  await db.put('productosComprados', {
    id,
    inicioSemana,
    comprado,
    actualizadoEn: new Date().toISOString()
  });
}
