import { initDB, obtenerPlatosCatalogo, resolverPlatoPlanificado, obtenerIngredientesPorPlato, obtenerCompradosSemana, obtenerProductosManuales } from '../db/db';
import { PlanificacionDia, PlatoCatalogo, ElementoCompra, Ingrediente } from '../types';

export interface OpcionesExportacion {
  planificacion: boolean;
  listaCompra: boolean;
  catalogo: boolean;
}

export interface PlatoSinIngsExport {
  fechaFormateada: string;
  tipo: string;
  nombrePlato: string;
}

export interface DatosExportacion {
  inicioSemana: Date;
  finSemana: Date;
  diasPlan: { fecha: Date; fechaIso: string; fechaFormateada: string; diaSemana: string; plan?: PlanificacionDia }[];
  elementosCompra: ElementoCompra[];
  platosSinIngredientes: PlatoSinIngsExport[];
  catalogoConIngs: { plato: PlatoCatalogo; ingredientes: Ingrediente[] }[];
}

export async function recopilarDatosExportacion(inicioSemana: Date): Promise<DatosExportacion> {
  const db = await initDB();
  const catalogo = await obtenerPlatosCatalogo(db);
  const inicioSemanaIso = inicioSemana.toISOString().split('T')[0];
  const compradosMap = await obtenerCompradosSemana(db, inicioSemanaIso);
  const productosManualesList = await obtenerProductosManuales(db, inicioSemanaIso);

  const finSemana = new Date(inicioSemana);
  finSemana.setDate(finSemana.getDate() + 6);

  const diasPlan: DatosExportacion['diasPlan'] = [];
  const planStore = db.transaction('planificacion', 'readonly').objectStore('planificacion');

  const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(inicioSemana);
    d.setDate(d.getDate() + i);
    const fechaIso = d.toISOString().split('T')[0];
    const plan = await planStore.get(fechaIso);

    const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const fechaFormateada = d.toLocaleDateString('es-ES', opciones);
    const diaSemana = diasNombres[d.getDay()];

    diasPlan.push({
      fecha: d,
      fechaIso,
      fechaFormateada,
      diaSemana,
      plan
    });
  }

  const platosPlanificadosSet = new Set<{ nombre: string; fechaFormateada: string; tipo: string }>();
  const platosMapeadosUnicos = new Map<string, { platoId: string; nombrePlato: string; origen: string }>();

  for (const dia of diasPlan) {
    if (!dia.plan) continue;
    const plan = dia.plan;

    const agregarPlato = (nombre: string, tipo: string) => {
      const limpio = nombre.trim();
      const norm = limpio.toLowerCase();
      if (!limpio || norm === 'fuera de casa') return;

      const platoObj = resolverPlatoPlanificado(limpio, catalogo);
      const opcionesFecha: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
      const fechaFStr = dia.fecha.toLocaleDateString('es-ES', opcionesFecha);
      const fechaFFormatted = fechaFStr.charAt(0).toUpperCase() + fechaFStr.slice(1);

      if (platoObj) {
        const key = `${platoObj.id}_${dia.fechaIso}_${tipo}`;
        platosMapeadosUnicos.set(key, { platoId: platoObj.id, nombrePlato: platoObj.nombre, origen: `${fechaFFormatted} (${tipo}: ${platoObj.nombre})` });
      } else {
        platosPlanificadosSet.add({ nombre: limpio, fechaFormateada: fechaFFormatted, tipo });
      }
    };

    if (plan.modoComida === 'DOS_PLATOS') {
      if (plan.primerPlato) agregarPlato(plan.primerPlato, '1.º Plato');
      if (plan.segundoPlato) agregarPlato(plan.segundoPlato, '2.º Plato');
    } else {
      if (plan.primerPlato) agregarPlato(plan.primerPlato, 'Comida');
    }
    if (plan.cena) agregarPlato(plan.cena, 'Cena');
  }

  const agrupador = new Map<string, {
    nombre: string;
    cantidad: number | null;
    unidad: string;
    categoria: string;
    origenes: Set<string>;
  }>();

  const platosSinIngsList: PlatoSinIngsExport[] = [];

  for (const [_, info] of platosMapeadosUnicos) {
    const ings = await obtenerIngredientesPorPlato(db, info.platoId);
    if (ings.length === 0) {
      const matchOrigen = info.origen.match(/(.+?)\s*\((.+?):\s*(.+?)\)/);
      const fechaF = matchOrigen ? matchOrigen[1] : '';
      const tipoF = matchOrigen ? matchOrigen[2] : 'Plato';
      platosSinIngsList.push({
        fechaFormateada: fechaF,
        tipo: tipoF,
        nombrePlato: info.nombrePlato
      });
      continue;
    }

    for (const ing of ings) {
      const nombreNorm = ing.nombre.trim().replace(/\s+/g, ' ').toLowerCase();
      const unidadNorm = ing.unidad.trim().replace(/\s+/g, ' ').toLowerCase();
      const keyAgrupacion = `${nombreNorm}_${unidadNorm}`;

      if (!agrupador.has(keyAgrupacion)) {
        agrupador.set(keyAgrupacion, {
          nombre: ing.nombre.trim().replace(/\s+/g, ' '),
          cantidad: ing.cantidad,
          unidad: ing.unidad.trim(),
          categoria: ing.categoria || 'Otros',
          origenes: new Set([info.nombrePlato])
        });
      } else {
        const item = agrupador.get(keyAgrupacion)!;
        item.origenes.add(info.nombrePlato);
        if (item.cantidad !== null && ing.cantidad !== null) {
          item.cantidad += ing.cantidad;
        } else if (item.cantidad === null) {
          item.cantidad = ing.cantidad;
        }
      }
    }
  }

  for (const p of platosPlanificadosSet) {
    platosSinIngsList.push({
      fechaFormateada: p.fechaFormateada,
      tipo: p.tipo,
      nombrePlato: p.nombre
    });
  }

  const elementosCompra: ElementoCompra[] = [];
  for (const [_, val] of agrupador) {
    const nombreNorm = val.nombre.toLowerCase().trim().replace(/\s+/g, ' ');
    const unidadNorm = val.unidad.toLowerCase().trim().replace(/\s+/g, ' ');
    const idEstable = `${inicioSemanaIso}_${nombreNorm}_${unidadNorm}`;

    elementosCompra.push({
      id: idEstable,
      nombre: val.nombre,
      cantidad: val.cantidad,
      unidad: val.unidad,
      categoria: val.categoria,
      origenes: Array.from(val.origenes),
      comprado: compradosMap.get(idEstable) || false,
      manual: false
    });
  }

  for (const prod of productosManualesList) {
    elementosCompra.push({
      id: prod.id,
      nombre: prod.nombre,
      cantidad: prod.cantidad,
      unidad: prod.unidad,
      categoria: prod.categoria,
      origenes: ['Producto manual'],
      comprado: prod.comprado,
      manual: true,
      productoManualId: prod.id
    });
  }

  const catalogoOrdenado = [...catalogo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const catalogoConIngs: DatosExportacion['catalogoConIngs'] = [];

  for (const plato of catalogoOrdenado) {
    const ings = await obtenerIngredientesPorPlato(db, plato.id);
    catalogoConIngs.push({
      plato,
      ingredientes: ings
    });
  }

  return {
    inicioSemana,
    finSemana,
    diasPlan,
    elementosCompra,
    platosSinIngredientes: platosSinIngsList,
    catalogoConIngs
  };
}
