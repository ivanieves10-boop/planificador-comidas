import { initDB, obtenerPlatosCatalogo, obtenerIngredientesPorPlato } from '../db/db';
import { cargarFavoritos } from './favoritos';
import { normalizarCategoria, CATEGORIAS_OFICIALES } from './categorias';

export type PeriodoEstadisticas = '7D' | '30D' | '3M' | 'TODO';

export interface RecetaUso {
  nombre: string;
  apariciones: number;
  esFavorita: boolean;
  categoria: string;
}

export interface CategoriaDistribucion {
  nombre: string;
  cantidad: number;
  porcentaje: number;
}

export interface ComparativaPeriodo {
  difTotalComidas: number;
  difPorcentajeVariedad: number;
  recetasNuevasUtilizadas: number;
}

export interface RecetaOlvidada {
  nombre: string;
  esFavorita: boolean;
  diasSinUsar: number | null;
}

export interface EquilibrioAlimentos {
  carne: number;
  pescado: number;
  verdura: number;
  legumbres: number;
  pasta: number;
  arroz: number;
  otros: number;
}

export interface DatosEstadisticas {
  totalComidas: number;
  recetasDiferentes: number;
  porcentajeVariedad: number;
  recetaMasUtilizada: RecetaUso | null;
  top5Recetas: RecetaUso[];
  categoriaMasFrecuente: string | null;
  distribucionCategorias: CategoriaDistribucion[];
  totalFavoritasUtilizadas: number;
  top5Favoritas: RecetaUso[];
  comparativa: ComparativaPeriodo | null;
  recetasOlvidadas: RecetaOlvidada[];
  equilibrio: EquilibrioAlimentos;
}

export async function calcularEstadisticas(periodo: PeriodoEstadisticas): Promise<DatosEstadisticas> {
  const db = await initDB();
  const catalogo = await obtenerPlatosCatalogo(db);
  const favsSet = cargarFavoritos();

  const planStore = db.transaction('planificacion', 'readonly').objectStore('planificacion');
  const allPlanes = await planStore.getAll();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaInicioMin: Date | null = null;
  let diasPeriodo: number | null = null;
  if (periodo === '7D') {
    diasPeriodo = 7;
    fechaInicioMin = new Date(hoy);
    fechaInicioMin.setDate(fechaInicioMin.getDate() - 6);
  } else if (periodo === '30D') {
    diasPeriodo = 30;
    fechaInicioMin = new Date(hoy);
    fechaInicioMin.setDate(fechaInicioMin.getDate() - 29);
  } else if (periodo === '3M') {
    diasPeriodo = 90;
    fechaInicioMin = new Date(hoy);
    fechaInicioMin.setMonth(fechaInicioMin.getMonth() - 3);
  }

  const obtenerComidasRango = (inicio: Date | null, fin: Date) => {
    const res: string[] = [];
    for (const plan of allPlanes) {
      const f = new Date(plan.fecha + 'T00:00:00');
      if ((!inicio || f >= inicio) && f <= fin) {
        const comidaFuera = plan.comidaFuera || plan.primerPlato?.trim().toLowerCase() === 'fuera de casa';
        const cenaFuera = plan.cenaFuera || plan.cena?.trim().toLowerCase() === 'fuera de casa';

        if (!comidaFuera) {
          if (plan.modoComida === 'DOS_PLATOS') {
            if (plan.primerPlato && plan.primerPlato.trim() && !plan.primerPlato.trim().toLowerCase().includes('fuera de casa')) {
              res.push(plan.primerPlato.trim());
            }
            if (plan.segundoPlato && plan.segundoPlato.trim() && !plan.segundoPlato.trim().toLowerCase().includes('fuera de casa')) {
              res.push(plan.segundoPlato.trim());
            }
          } else {
            if (plan.primerPlato && plan.primerPlato.trim() && !plan.primerPlato.trim().toLowerCase().includes('fuera de casa')) {
              res.push(plan.primerPlato.trim());
            }
          }
        }
        if (!cenaFuera) {
          if (plan.cena && plan.cena.trim() && !plan.cena.trim().toLowerCase().includes('fuera de casa')) {
            res.push(plan.cena.trim());
          }
        }
      }
    }
    return res;
  };

  const comidasActuales = obtenerComidasRango(fechaInicioMin, hoy);
  const totalComidas = comidasActuales.length;

  // Recetas olvidadas (>60 días o nunca)
  const historialConFechas = new Map<string, Date>();
  for (const plan of allPlanes) {
    const f = new Date(plan.fecha + 'T00:00:00');
    const checkPlato = (plato?: string, fuera?: boolean) => {
      if (plato && !fuera && plato.trim() && !plato.trim().toLowerCase().includes('fuera de casa')) {
        const norm = plato.trim().toLowerCase();
        const prev = historialConFechas.get(norm);
        if (!prev || f > prev) {
          historialConFechas.set(norm, f);
        }
      }
    };
    checkPlato(plan.primerPlato, plan.comidaFuera);
    if (plan.modoComida === 'DOS_PLATOS') checkPlato(plan.segundoPlato, plan.comidaFuera);
    checkPlato(plan.cena, plan.cenaFuera);
  }

  const catalogoValido = catalogo.filter(p => !p.nombre.trim().toLowerCase().includes('fuera de casa'));
  const recetasOlvidadas: RecetaOlvidada[] = [];

  for (const plato of catalogoValido) {
    const norm = plato.nombre.trim().toLowerCase();
    const ultimaFecha = historialConFechas.get(norm);
    const esFav = favsSet.has(norm);

    if (!ultimaFecha) {
      recetasOlvidadas.push({ nombre: plato.nombre, esFavorita: esFav, diasSinUsar: null });
    } else {
      const diffTime = Math.abs(hoy.getTime() - ultimaFecha.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 60) {
        recetasOlvidadas.push({ nombre: plato.nombre, esFavorita: esFav, diasSinUsar: diffDays });
      }
    }
  }

  recetasOlvidadas.sort((a, b) => {
    if (a.diasSinUsar === null && b.diasSinUsar !== null) return -1;
    if (a.diasSinUsar !== null && b.diasSinUsar === null) return 1;
    return (b.diasSinUsar || 0) - (a.diasSinUsar || 0);
  });

  if (totalComidas === 0) {
    return {
      totalComidas: 0,
      recetasDiferentes: 0,
      porcentajeVariedad: 0,
      recetaMasUtilizada: null,
      top5Recetas: [],
      categoriaMasFrecuente: null,
      distribucionCategorias: [],
      totalFavoritasUtilizadas: 0,
      top5Favoritas: [],
      comparativa: null,
      recetasOlvidadas,
      equilibrio: { carne: 0, pescado: 0, verdura: 0, legumbres: 0, pasta: 0, arroz: 0, otros: 0 }
    };
  }

  const conteoNorm = new Map<string, number>();
  const nombreOriginalMap = new Map<string, string>();

  for (const c of comidasActuales) {
    const norm = c.toLowerCase();
    conteoNorm.set(norm, (conteoNorm.get(norm) || 0) + 1);
    if (!nombreOriginalMap.has(norm)) {
      nombreOriginalMap.set(norm, c);
    }
  }

  // Cargar categorías de cada plato
  const categoriaMap = new Map<string, string>();
  for (const [norm, orig] of nombreOriginalMap) {
    const platoObj = catalogo.find(p => p.nombre.toLowerCase().trim() === norm);
    if (platoObj) {
      const ings = await obtenerIngredientesPorPlato(db, platoObj.id);
      if (ings.length > 0) {
        const catCounts = new Map<string, number>();
        for (const ing of ings) {
          const c = normalizarCategoria(ing.categoria);
          catCounts.set(c, (catCounts.get(c) || 0) + 1);
        }
        let topCat = "Otros";
        let max = -1;
        for (const [c, cnt] of catCounts) {
          if (cnt > max) {
            max = cnt;
            topCat = c;
          }
        }
        categoriaMap.set(norm, topCat);
      } else {
        categoriaMap.set(norm, "Otros");
      }
    } else {
      categoriaMap.set(norm, "Otros");
    }
  }

  const listaRecetasUso: RecetaUso[] = Array.from(conteoNorm.entries()).map(([norm, apariciones]) => {
    const nombre = nombreOriginalMap.get(norm) || norm;
    return {
      nombre,
      apariciones,
      esFavorita: favsSet.has(norm),
      categoria: categoriaMap.get(norm) || "Otros"
    };
  }).sort((a, b) => b.apariciones - a.apariciones);

  const recetasDiferentes = listaRecetasUso.length;
  const porcentajeVariedad = (recetasDiferentes / totalComidas) * 100;
  const recetaMasUtilizada = listaRecetasUso[0] || null;
  const top5Recetas = listaRecetasUso.slice(0, 5);

  const conteoCat = new Map<string, number>();
  for (const c of comidasActuales) {
    const cat = categoriaMap.get(c.toLowerCase()) || "Otros";
    conteoCat.set(cat, (conteoCat.get(cat) || 0) + 1);
  }

  const distribucionCategorias: CategoriaDistribucion[] = CATEGORIAS_OFICIALES.map(cat => {
    const cantidad = conteoCat.get(cat) || 0;
    return {
      nombre: cat,
      cantidad,
      porcentaje: (cantidad / totalComidas) * 100
    };
  }).filter(c => c.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);

  const categoriaMasFrecuente = distribucionCategorias[0]?.nombre || null;

  const listaFavsUso = listaRecetasUso.filter(r => r.esFavorita);
  const totalFavoritasUtilizadas = listaFavsUso.reduce((sum, r) => sum + r.apariciones, 0);
  const top5Favoritas = listaFavsUso.slice(0, 5);

  // Comparativa
  let comparativa: ComparativaPeriodo | null = null;
  if (diasPeriodo && fechaInicioMin) {
    const finPrevio = new Date(fechaInicioMin);
    finPrevio.setDate(finPrevio.getDate() - 1);
    const inicioPrevio = new Date(finPrevio);
    inicioPrevio.setDate(inicioPrevio.getDate() - diasPeriodo + 1);

    const comidasPrevias = obtenerComidasRango(inicioPrevio, finPrevio);
    const totalPrev = comidasPrevias.length;
    const recetasPrevNorm = new Set(comidasPrevias.map(c => c.toLowerCase()));
    const diffComidas = totalComidas - totalPrev;
    const variedadPrev = totalPrev > 0 ? (recetasPrevNorm.size / totalPrev) * 100 : 0;
    const diffVariedad = porcentajeVariedad - variedadPrev;
    const recetasNuevas = Array.from(conteoNorm.keys()).filter(k => !recetasPrevNorm.has(k)).length;

    comparativa = {
      difTotalComidas: diffComidas,
      difPorcentajeVariedad: diffVariedad,
      recetasNuevasUtilizadas: recetasNuevas
    };
  }

  // Equilibrio semanal
  let carne = 0, pescado = 0, verdura = 0, legumbres = 0, pasta = 0, arroz = 0, otros = 0;
  for (const c of comidasActuales) {
    const norm = c.toLowerCase();
    const cat = categoriaMap.get(norm) || "Otros";
    const platoObj = catalogo.find(p => p.nombre.toLowerCase().trim() === norm);
    let tieneCarne = cat === 'Carnicería' || norm.includes('carne') || norm.includes('pollo') || norm.includes('ternera') || norm.includes('cerdo') || norm.includes('hamburguesa') || norm.includes('pavo');
    let tienePescado = cat === 'Pescadería' || norm.includes('pescado') || norm.includes('merluza') || norm.includes('salmón') || norm.includes('atún') || norm.includes('bacalao');
    let tieneVerdura = cat === 'Frutas y Verduras' || norm.includes('verdura') || norm.includes('crema') || norm.includes('ensalada') || norm.includes('calabacín') || norm.includes('sopa');
    let tieneLegumbres = norm.includes('lenteja') || norm.includes('garbanzo') || norm.includes('alubia');
    let tienePasta = norm.includes('pasta') || norm.includes('macarrón') || norm.includes('espagueti') || norm.includes('lasaña') || norm.includes('pizza');
    let tieneArroz = norm.includes('arroz') || norm.includes('paella');

    if (platoObj) {
      const ings = await obtenerIngredientesPorPlato(db, platoObj.id);
      for (const ing of ings) {
        const iname = ing.nombre.toLowerCase();
        if (ing.categoria === 'Carnicería' || iname.includes('carne') || iname.includes('pollo')) tieneCarne = true;
        if (ing.categoria === 'Pescadería' || iname.includes('pescado')) tienePescado = true;
        if (ing.categoria === 'Frutas y Verduras') tieneVerdura = true;
        if (iname.includes('lenteja') || iname.includes('garbanzo') || iname.includes('alubia')) tieneLegumbres = true;
        if (iname.includes('pasta') || iname.includes('macarrón') || iname.includes('espagueti')) tienePasta = true;
        if (iname.includes('arroz')) tieneArroz = true;
      }
    }

    if (tieneCarne) carne++;
    if (tienePescado) pescado++;
    if (tieneVerdura) verdura++;
    if (tieneLegumbres) legumbres++;
    if (tienePasta) pasta++;
    if (tieneArroz) arroz++;
    if (!tieneCarne && !tienePescado && !tieneVerdura && !tieneLegumbres && !tienePasta && !tieneArroz) otros++;
  }

  return {
    totalComidas,
    recetasDiferentes,
    porcentajeVariedad,
    recetaMasUtilizada,
    top5Recetas,
    categoriaMasFrecuente,
    distribucionCategorias,
    totalFavoritasUtilizadas,
    top5Favoritas,
    comparativa,
    recetasOlvidadas,
    equilibrio: { carne, pescado, verdura, legumbres, pasta, arroz, otros }
  };
}
