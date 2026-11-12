import * as XLSX from 'xlsx';
import { DatosExportacion, OpcionesExportacion } from './modelosExportacion';
import { CATEGORIAS_ORDEN } from '../types';
import { formatearIntervaloSemana } from '../utils/calculoSemana';

export async function generarYDescargarExcel(datos: DatosExportacion, opciones: OpcionesExportacion): Promise<void> {
  const wb = XLSX.utils.book_new();

  // 1. Hoja "Planificación semanal"
  if (opciones.planificacion) {
    const planRows: any[][] = [];
    const intervaloStr = formatearIntervaloSemana(datos.inicioSemana);

    planRows.push(["Planificación semanal", `Semana del ${intervaloStr}`, "", "", "", ""]);
    planRows.push(["Fecha", "Día", "Tipo", "Primer plato o plato único", "Segundo plato", "Observaciones"]);

    for (const dia of datos.diasPlan) {
      const plan = dia.plan;
      const fechaFmt = dia.fechaFormateada;
      const diaSemana = dia.diaSemana;

      if (plan) {
        if (plan.modoComida === 'DOS_PLATOS') {
          const obsComida = plan.primerPlato.toLowerCase() === 'fuera de casa' ? 'Fuera de casa' : '';
          planRows.push([fechaFmt, diaSemana, "Comida", plan.primerPlato, plan.segundoPlato, obsComida]);
        } else {
          const platoComida = plan.primerPlato || 'Fuera de casa';
          const obsComida = platoComida.toLowerCase() === 'fuera de casa' ? 'Fuera de casa' : '';
          planRows.push([fechaFmt, diaSemana, "Comida", platoComida, "", obsComida]);
        }

        const platoCena = plan.cena || 'Tortilla y ensalada';
        const obsCena = platoCena.toLowerCase() === 'fuera de casa' ? 'Fuera de casa' : '';
        planRows.push([fechaFmt, diaSemana, "Cena", platoCena, "", obsCena]);
      } else {
        planRows.push([fechaFmt, diaSemana, "Comida", "Fuera de casa", "", "Fuera de casa"]);
        planRows.push([fechaFmt, diaSemana, "Cena", "Tortilla y ensalada", "", ""]);
      }
    }

    const wsPlan = XLSX.utils.aoa_to_sheet(planRows);
    wsPlan['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 30 },
      { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, wsPlan, "Planificación semanal");
  }

  // 2. Hoja "Lista de la compra"
  if (opciones.listaCompra) {
    const compraRows: any[][] = [];
    compraRows.push(["Comprado", "Categoría", "Producto", "Cantidad", "Unidad", "Origen", "Manual"]);

    const elementosOrdenados = [...datos.elementosCompra].sort((a, b) => {
      const catIdxA = CATEGORIAS_ORDEN.indexOf(a.categoria);
      const catIdxB = CATEGORIAS_ORDEN.indexOf(b.categoria);
      if (catIdxA !== catIdxB) return (catIdxA === -1 ? 99 : catIdxA) - (catIdxB === -1 ? 99 : catIdxB);
      return a.nombre.localeCompare(b.nombre, 'es');
    });

    for (const item of elementosOrdenados) {
      let cantFinal = item.cantidad;
      let unidadFinal = item.unidad;

      if (item.unidad.toLowerCase() === 'g' && cantFinal !== null && cantFinal >= 1000) {
        cantFinal = cantFinal / 1000;
        unidadFinal = 'kg';
      } else if (item.unidad.toLowerCase() === 'ml' && cantFinal !== null && cantFinal >= 1000) {
        cantFinal = cantFinal / 1000;
        unidadFinal = 'l';
      }

      const compradoStr = item.comprado ? "Sí" : "No";
      const manualStr = item.manual ? "Sí" : "No";
      const origenStr = item.origenes.join(', ');

      const unidadLower = unidadFinal.toLowerCase();
      if (unidadLower === 'al gusto') {
        compraRows.push([compradoStr, item.categoria, item.nombre, "", "al gusto", origenStr, manualStr]);
      } else if (unidadLower === 'sin unidad') {
        compraRows.push([compradoStr, item.categoria, item.nombre, "", "sin unidad", origenStr, manualStr]);
      } else {
        compraRows.push([compradoStr, item.categoria, item.nombre, cantFinal !== null ? Number(cantFinal) : "", unidadFinal, origenStr, manualStr]);
      }
    }

    if (datos.platosSinIngredientes.length > 0) {
      compraRows.push([]);
      compraRows.push(["Platos sin ingredientes configurados", "", "", "", "", "", ""]);
      compraRows.push(["Fecha", "Tipo", "Plato", "", "", "", ""]);
      for (const p of datos.platosSinIngredientes) {
        compraRows.push([p.fechaFormateada, p.tipo, p.nombrePlato, "", "", "", ""]);
      }
    }

    const wsCompra = XLSX.utils.aoa_to_sheet(compraRows);
    wsCompra['!cols'] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 30 },
      { wch: 14 },
      { wch: 16 },
      { wch: 40 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsCompra, "Lista de la compra");
  }

  // 3. Hoja "Catálogo e ingredientes"
  if (opciones.catalogo) {
    const catRows: any[][] = [];
    catRows.push(["Plato", "Ingrediente", "Cantidad", "Unidad", "Categoría"]);

    for (const item of datos.catalogoConIngs) {
      const platoNombre = item.plato.nombre;
      if (item.ingredientes.length === 0) {
        catRows.push([platoNombre, "", "", "", ""]);
      } else {
        for (const ing of item.ingredientes) {
          const cantFinal = ing.cantidad;
          const unidadLower = ing.unidad.toLowerCase();
          if (unidadLower === 'al gusto' || unidadLower === 'sin unidad') {
            catRows.push([platoNombre, ing.nombre, "", ing.unidad, ing.categoria]);
          } else {
            catRows.push([platoNombre, ing.nombre, cantFinal !== null ? Number(cantFinal) : "", ing.unidad, ing.categoria]);
          }
        }
      }
    }

    const wsCat = XLSX.utils.aoa_to_sheet(catRows);
    wsCat['!cols'] = [
      { wch: 32 },
      { wch: 30 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 }
    ];
    XLSX.utils.book_append_sheet(wb, wsCat, "Catálogo e ingredientes");
  }

  const inicioIso = datos.inicioSemana.toISOString().split('T')[0];
  const finIso = datos.finSemana.toISOString().split('T')[0];
  const nombreArchivo = `Planificador_comidas_${inicioIso}_${finIso}.xlsx`;

  try {
    XLSX.writeFile(wb, nombreArchivo);
  } catch (err) {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
