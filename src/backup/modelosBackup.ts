import { initDB } from '../db/db';

export interface BackupData {
  aplicacion: string;
  versionCopia: number;
  fechaExportacion: string;
  versionEsquemaIndexedDB: number;
  datos: {
    configuracion: any[];
    planificacion: any[];
    platos: any[];
    ingredientes: any[];
    productosComprados: any[];
    productosManuales: any[];
    platosPredeterminadosExcluidos: any[];
    [key: string]: any[];
  };
}

export async function recopilarDatosBackup(): Promise<BackupData> {
  const db = await initDB();
  const stores = [
    'configuracion',
    'planificacion',
    'platos',
    'ingredientes',
    'productosComprados',
    'productosManuales',
    'platosPredeterminadosExcluidos'
  ];

  const datos: Record<string, any[]> = {};
  for (const storeName of stores) {
    if (db.objectStoreNames.contains(storeName as any)) {
      const items = await db.getAll(storeName as any);
      datos[storeName] = items;
    } else {
      datos[storeName] = [];
    }
  }

  return {
    aplicacion: "Planificador de comidas",
    versionCopia: 1,
    fechaExportacion: new Date().toISOString(),
    versionEsquemaIndexedDB: 6,
    datos: {
      configuracion: datos['configuracion'] || [],
      planificacion: datos['planificacion'] || [],
      platos: datos['platos'] || [],
      ingredientes: datos['ingredientes'] || [],
      productosComprados: datos['productosComprados'] || [],
      productosManuales: datos['productosManuales'] || [],
      platosPredeterminadosExcluidos: datos['platosPredeterminadosExcluidos'] || []
    }
  };
}
