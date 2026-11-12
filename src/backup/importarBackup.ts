import { initDB } from '../db/db';
import { BackupData, recopilarDatosBackup } from './modelosBackup';

export interface ResumenBackup {
  fecha: string;
  totalPlatos: number;
  totalIngredientes: number;
  totalPlanificacion: number;
  totalManuales: number;
  primerDiaSemana?: string;
}

export function validarYAnalizarBackup(textoJson: string): { backup?: BackupData; error?: string; resumen?: ResumenBackup } {
  if (!textoJson || textoJson.trim() === '') {
    return { error: 'El archivo de copia está vacío' };
  }

  let json: any;
  try {
    json = JSON.parse(textoJson);
  } catch (e) {
    return { error: 'El archivo no es una copia válida del Planificador de comidas' };
  }

  if (!json || typeof json !== 'object') {
    return { error: 'El archivo no es una copia válida del Planificador de comidas' };
  }

  if (json.aplicacion !== 'Planificador de comidas') {
    return { error: 'El archivo no es una copia válida del Planificador de comidas' };
  }

  if (typeof json.versionCopia !== 'number' || json.versionCopia > 1) {
    return { error: 'La copia pertenece a una versión más reciente y no puede importarse' };
  }

  if (!json.datos || typeof json.datos !== 'object') {
    return { error: 'El archivo no es una copia válida del Planificador de comidas' };
  }

  const storesRequeridos = ['configuracion', 'planificacion', 'platos', 'ingredientes', 'productosComprados', 'productosManuales', 'platosPredeterminadosExcluidos'];
  for (const store of storesRequeridos) {
    if (!Array.isArray(json.datos[store])) {
      return { error: 'El archivo no es una copia válida del Planificador de comidas' };
    }
  }

  let primerDiaSemana = 'Lunes';
  const configRecord = json.datos.configuracion.find((c: any) => c.id === 'app_config');
  if (configRecord && configRecord.primerDiaSemana) {
    const mapaDias: Record<string, string> = {
      MONDAY: 'Lunes',
      TUESDAY: 'Martes',
      WEDNESDAY: 'Miércoles',
      THURSDAY: 'Jueves',
      FRIDAY: 'Viernes',
      SATURDAY: 'Sábado',
      SUNDAY: 'Domingo'
    };
    primerDiaSemana = mapaDias[configRecord.primerDiaSemana] || configRecord.primerDiaSemana;
  }

  const resumen: ResumenBackup = {
    fecha: new Date(json.fechaExportacion || Date.now()).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
    totalPlatos: json.datos.platos.length,
    totalIngredientes: json.datos.ingredientes.length,
    totalPlanificacion: json.datos.planificacion.length,
    totalManuales: json.datos.productosManuales.length,
    primerDiaSemana
  };

  return { backup: json as BackupData, resumen };
}

export async function restaurarBackup(backup: BackupData, modo: 'sustituir' | 'combinar'): Promise<void> {
  const db = await initDB();
  const stores = ['configuracion', 'planificacion', 'platos', 'ingredientes', 'productosComprados', 'productosManuales', 'platosPredeterminadosExcluidos'];

  if (modo === 'sustituir') {
    const backupActual = await recopilarDatosBackup();

    try {
      const tx = db.transaction(stores as any, 'readwrite');
      for (const storeName of stores) {
        const store = tx.objectStore(storeName as any);
        await store.clear();
        const registros = backup.datos[storeName] || [];
        for (const reg of registros) {
          await store.put(reg);
        }
      }
      await tx.done;
    } catch (e) {
      console.error("Error al sustituir datos, intentando restaurar...", e);
      const txRollback = db.transaction(stores as any, 'readwrite');
      for (const storeName of stores) {
        const store = txRollback.objectStore(storeName as any);
        await store.clear();
        const registros = backupActual.datos[storeName] || [];
        for (const reg of registros) {
          await store.put(reg);
        }
      }
      await txRollback.done;
      throw new Error("No se pudo importar la copia. Se han conservado los datos anteriores.");
    }
  } else {
    const tx = db.transaction(stores as any, 'readwrite');

    const configStore = tx.objectStore('configuracion');
    for (const conf of (backup.datos.configuracion || [])) {
      const existente = await configStore.get(conf.id);
      if (!existente) {
        await configStore.put(conf);
      }
    }

    const planStore = tx.objectStore('planificacion');
    for (const plan of (backup.datos.planificacion || [])) {
      const existente = await planStore.get(plan.fecha);
      if (!existente || (plan.actualizadoEn && (!existente.actualizadoEn || plan.actualizadoEn > existente.actualizadoEn))) {
        await planStore.put(plan);
      }
    }

    const platosStore = tx.objectStore('platos');
    const platosActuales = await platosStore.getAll();
    const nombresPlatosActuales = new Map(platosActuales.map(p => [p.nombre.trim().toLowerCase(), p]));

    for (const plato of (backup.datos.platos || [])) {
      const norm = plato.nombre.trim().toLowerCase();
      const existente = nombresPlatosActuales.get(norm);
      if (!existente) {
        await platosStore.put(plato);
        nombresPlatosActuales.set(norm, plato);
      } else {
        if (plato.actualizadoEn && (!existente.actualizadoEn || plato.actualizadoEn > existente.actualizadoEn)) {
          plato.id = existente.id;
          await platosStore.put(plato);
        }
      }
    }

    const ingStore = tx.objectStore('ingredientes');
    const ingActuales = await ingStore.getAll();
    const ingMap = new Map(ingActuales.map(i => [`${i.platoId}_${i.nombre.trim().toLowerCase()}_${i.unidad.trim().toLowerCase()}`, i]));

    for (const ing of (backup.datos.ingredientes || [])) {
      const key = `${ing.platoId}_${ing.nombre.trim().toLowerCase()}_${ing.unidad.trim().toLowerCase()}`;
      const existente = ingMap.get(key);
      if (!existente) {
        await ingStore.put(ing);
        ingMap.set(key, ing);
      } else {
        if (ing.actualizadoEn && (!existente.actualizadoEn || ing.actualizadoEn > existente.actualizadoEn)) {
          ing.id = existente.id;
          await ingStore.put(ing);
        }
      }
    }

    const compradosStore = tx.objectStore('productosComprados');
    for (const comp of (backup.datos.productosComprados || [])) {
      const existente = await compradosStore.get(comp.id);
      if (!existente || (comp.actualizadoEn && (!existente.actualizadoEn || comp.actualizadoEn > existente.actualizadoEn))) {
        await compradosStore.put(comp);
      }
    }

    const manualesStore = tx.objectStore('productosManuales');
    for (const man of (backup.datos.productosManuales || [])) {
      const existente = await manualesStore.get(man.id);
      if (!existente || (man.actualizadoEn && (!existente.actualizadoEn || man.actualizadoEn > existente.actualizadoEn))) {
        await manualesStore.put(man);
      }
    }

    const excluidosStore = tx.objectStore('platosPredeterminadosExcluidos');
    for (const exc of (backup.datos.platosPredeterminadosExcluidos || [])) {
      const existente = await excluidosStore.get(exc.nombre);
      if (!existente) {
        await excluidosStore.put(exc);
      }
    }

    await tx.done;
  }
}
