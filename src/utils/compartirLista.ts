import { ElementoCompra, CATEGORIAS_ORDEN } from '../types';
import { formatearIntervaloSemana } from './calculoSemana';

interface PlatoSinIngsTexto {
  fechaFormateada: string;
  tipo: string;
  nombrePlato: string;
}

export function generarTextoListaCompra(
  inicioSemana: Date,
  elementos: ElementoCompra[],
  platosSinIngredientes: PlatoSinIngsTexto[]
): string {
  const intervalo = formatearIntervaloSemana(inicioSemana);
  let lineas: string[] = [];

  lineas.push("LISTA DE LA COMPRA");
  lineas.push(`Semana del ${intervalo}`);
  lineas.push("");

  const elementosPorCategoria = CATEGORIAS_ORDEN.reduce((acc, cat) => {
    const items = elementos.filter(e => e.categoria === cat);
    if (items.length > 0) {
      items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      acc[cat] = items;
    }
    return acc;
  }, {} as Record<string, ElementoCompra[]>);

  for (const cat of Object.keys(elementosPorCategoria)) {
    lineas.push(cat.toUpperCase());
    for (const item of elementosPorCategoria[cat]) {
      const checkbox = item.comprado ? "☑" : "☐";
      let cantFinal = item.cantidad;
      let unidadFinal = item.unidad;

      if (item.unidad.toLowerCase() === 'g' && cantFinal !== null && cantFinal >= 1000) {
        cantFinal = cantFinal / 1000;
        unidadFinal = 'kg';
      } else if (item.unidad.toLowerCase() === 'ml' && cantFinal !== null && cantFinal >= 1000) {
        cantFinal = cantFinal / 1000;
        unidadFinal = 'l';
      }

      const cantStr = cantFinal !== null
        ? (cantFinal % 1 === 0 ? cantFinal.toString() : cantFinal.toString().replace('.', ','))
        : '';
      const unidadLower = unidadFinal.toLowerCase();
      const cantidadFormateada = unidadLower === 'al gusto' || unidadLower === 'sin unidad'
        ? (unidadLower === 'al gusto' ? 'Al gusto' : '')
        : (cantStr ? `${cantStr} ${unidadFinal}` : unidadFinal);

      const detalleCantidad = cantidadFormateada ? `: ${cantidadFormateada}` : '';
      const etiquetaManual = item.manual ? ' [Manual]' : '';

      lineas.push(`${checkbox} ${item.nombre}${detalleCantidad}${etiquetaManual}`);

      if (!item.manual && item.origenes && item.origenes.length > 0) {
        lineas.push(`   Plato: ${item.origenes.join(', ')}`);
      }
    }
    lineas.push("");
  }

  if (platosSinIngredientes.length > 0) {
    lineas.push("PLATOS SIN INGREDIENTES CONFIGURADOS");
    for (const p of platosSinIngredientes) {
      lineas.push(`- ${p.fechaFormateada}: ${p.tipo}, ${p.nombrePlato}`);
    }
    lineas.push("");
  }

  return lineas.join("\n").trim();
}
