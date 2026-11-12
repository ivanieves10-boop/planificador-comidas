import React, { useEffect, useState } from 'react';
import { initDB, obtenerPlatosCatalogo, resolverPlatoPlanificado, obtenerIngredientesPorPlato, obtenerCompradosSemana, guardarComprado, obtenerProductosManuales, añadirProductoManual, actualizarProductoManual, eliminarProductoManual, existeProductoManualDuplicado } from '../db/db';
import { ElementoCompra, CATEGORIAS_ORDEN, PlanificacionDia, ProductoManual, UNIDADES_MANUAL, CATEGORIAS_INGREDIENTE } from '../types';
import { formatearIntervaloSemana } from '../utils/calculoSemana';
import { generarTextoListaCompra } from '../utils/compartirLista';

interface ListaCompraScreenProps {
  inicioSemana: Date;
  onVolver: () => void;
}

interface PlatoSinIngredientes {
  fechaFormateada: string;
  tipo: string;
  nombrePlato: string;
}

export const ListaCompraScreen: React.FC<ListaCompraScreenProps> = ({ inicioSemana, onVolver }) => {
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const [elementos, setElementos] = useState<ElementoCompra[]>([]);
  const [platosSinIngredientes, setPlatosSinIngredientes] = useState<PlatoSinIngredientes[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [mostrarDialogo, setMostrarDialogo] = useState<boolean>(false);
  const [productoAEditar, setProductoAEditar] = useState<ProductoManual | null>(null);
  const [productoAEliminar, setProductoAEliminar] = useState<ProductoManual | null>(null);

  const inicioSemanaIso = inicioSemana.toISOString().split('T')[0];

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const abrirNuevoProducto = () => {
    setProductoAEditar(null);
    setMostrarDialogo(true);
  };

  const generarLista = async () => {
    try {
      setCargando(true);
      setError(false);
      const db = await initDB();
      const catalogo = await obtenerPlatosCatalogo(db);
      const compradosMap = await obtenerCompradosSemana(db, inicioSemanaIso);
      const productosManualesList = await obtenerProductosManuales(db, inicioSemanaIso);

      const diasFechas: { fechaStr: string; fechaObj: Date; fechaFormateada: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(d.getDate() + i);
        const fechaStr = d.toISOString().split('T')[0];
        const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        const fechaFormateada = d.toLocaleDateString('es-ES', opciones);
        diasFechas.push({ fechaStr, fechaObj: d, fechaFormateada: fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1) });
      }

      const planStore = db.transaction('planificacion', 'readonly').objectStore('planificacion');
      const platosPlanificadosSet = new Set<{ nombre: string; fechaFormateada: string; tipo: string }>();
      const platosMapeadosUnicos = new Map<string, { platoId: string; nombrePlato: string; origen: string }>();

      for (const dia of diasFechas) {
        const plan: PlanificacionDia | undefined = await planStore.get(dia.fechaStr);
        if (!plan) continue;

        const agregarPlato = (nombre: string, tipo: string) => {
          const limpio = nombre.trim();
          const norm = limpio.toLowerCase();
          if (!limpio || norm === 'fuera de casa') return;

          const platoObj = resolverPlatoPlanificado(limpio, catalogo);
          if (platoObj) {
            const key = `${platoObj.id}_${dia.fechaStr}_${tipo}`;
            platosMapeadosUnicos.set(key, { platoId: platoObj.id, nombrePlato: platoObj.nombre, origen: `${dia.fechaFormateada} (${tipo}: ${platoObj.nombre})` });
          } else {
            platosPlanificadosSet.add({ nombre: limpio, fechaFormateada: dia.fechaFormateada, tipo });
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

      const platosSinIngsList: PlatoSinIngredientes[] = [];

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

      const elementosFinales: ElementoCompra[] = [];

      // 1. Ingredientes automáticos
      for (const [_, val] of agrupador) {
        const nombreNorm = val.nombre.toLowerCase().trim().replace(/\s+/g, ' ');
        const unidadNorm = val.unidad.toLowerCase().trim().replace(/\s+/g, ' ');
        const idEstable = `${inicioSemanaIso}_${nombreNorm}_${unidadNorm}`;

        elementosFinales.push({
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

      // 2. Productos manuales
      for (const prod of productosManualesList) {
        elementosFinales.push({
          id: prod.id,
          nombre: prod.nombre,
          cantidad: prod.cantidad,
          unidad: prod.unidad,
          categoria: prod.categoria,
          origenes: ['Manual'],
          comprado: prod.comprado,
          manual: true,
          productoManualId: prod.id
        });
      }

      setElementos(elementosFinales);
      setPlatosSinIngredientes(platosSinIngsList);
    } catch (e) {
      console.error("Error al generar lista de la compra:", e);
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    generarLista();
  }, [inicioSemanaIso]);

  const toggleComprado = async (item: ElementoCompra) => {
    const nuevoEstado = !item.comprado;
    setElementos(prev => prev.map(el => el.id === item.id ? { ...el, comprado: nuevoEstado } : el));
    const db = await initDB();
    if (item.manual && item.productoManualId) {
      const prodList = await obtenerProductosManuales(db, inicioSemanaIso);
      const prod = prodList.find(p => p.id === item.productoManualId);
      if (prod) {
        prod.comprado = nuevoEstado;
        prod.actualizadoEn = new Date().toISOString();
        await actualizarProductoManual(db, prod);
      }
    } else {
      await guardarComprado(db, item.id, inicioSemanaIso, nuevoEstado);
    }
  };

  const marcarTodo = async () => {
    const nuevoEstado = true;
    setElementos(prev => prev.map(el => ({ ...el, comprado: nuevoEstado })));
    const db = await initDB();
    for (const el of elementos) {
      if (el.manual && el.productoManualId) {
        const prodList = await obtenerProductosManuales(db, inicioSemanaIso);
        const prod = prodList.find(p => p.id === el.productoManualId);
        if (prod) {
          prod.comprado = nuevoEstado;
          prod.actualizadoEn = new Date().toISOString();
          await actualizarProductoManual(db, prod);
        }
      } else {
        await guardarComprado(db, el.id, inicioSemanaIso, nuevoEstado);
      }
    }
  };

  const desmarcarTodo = async () => {
    const nuevoEstado = false;
    setElementos(prev => prev.map(el => ({ ...el, comprado: nuevoEstado })));
    const db = await initDB();
    for (const el of elementos) {
      if (el.manual && el.productoManualId) {
        const prodList = await obtenerProductosManuales(db, inicioSemanaIso);
        const prod = prodList.find(p => p.id === el.productoManualId);
        if (prod) {
          prod.comprado = nuevoEstado;
          prod.actualizadoEn = new Date().toISOString();
          await actualizarProductoManual(db, prod);
        }
      } else {
        await guardarComprado(db, el.id, inicioSemanaIso, nuevoEstado);
      }
    }
  };

  const handleEliminarManual = async (prod: ProductoManual) => {
    const db = await initDB();
    await eliminarProductoManual(db, prod.id);
    setProductoAEliminar(null);
    mostrarToast("Producto eliminado");
    await generarLista();
  };

  const handleCompartir = async () => {
    if (elementos.length === 0 && platosSinIngredientes.length === 0) {
      mostrarToast("No hay productos para compartir");
      return;
    }

    const texto = generarTextoListaCompra(inicioSemana, elementos, platosSinIngredientes);
    const asunto = `Lista de la compra, ${formatearIntervaloSemana(inicioSemana)}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: asunto,
          text: texto
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        mostrarToast("La lista se ha copiado al portapapeles");
      } else {
        copiarFallback(texto, "La lista se ha copiado al portapapeles", "No se pudo compartir la lista");
      }
    } catch (e) {
      mostrarToast("No se pudo compartir la lista");
    }
  };

  const handleCopiar = async () => {
    if (elementos.length === 0 && platosSinIngredientes.length === 0) {
      mostrarToast("No hay productos para compartir");
      return;
    }

    const texto = generarTextoListaCompra(inicioSemana, elementos, platosSinIngredientes);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        mostrarToast("Lista copiada al portapapeles");
      } else {
        copiarFallback(texto, "Lista copiada al portapapeles", "No se pudo copiar la lista");
      }
    } catch (e) {
      mostrarToast("No se pudo copiar la lista");
    }
  };

  const copiarFallback = (texto: string, mensajeExito: string, mensajeError: string) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = texto;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const exitoso = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (exitoso) {
        mostrarToast(mensajeExito);
      } else {
        mostrarToast(mensajeError);
      }
    } catch (err) {
      mostrarToast(mensajeError);
    }
  };

  const elementosPorCategoria = CATEGORIAS_ORDEN.reduce((acc, cat) => {
    const items = elementos.filter(e => e.categoria === cat);
    if (items.length > 0) {
      items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      acc[cat] = items;
    }
    return acc;
  }, {} as Record<string, ElementoCompra[]>);

  const hayContenido = elementos.length > 0 || platosSinIngredientes.length > 0;

  return (
    <div className="shopping-screen">
      <header className="shopping-header">
        <div>
          <h1 className="app-title" style={{ fontSize: '24px' }}>Lista de la compra</h1>
          <p className="app-subtitle" style={{ color: '#E5F1E8', margin: '4px 0 0' }}>{formatearIntervaloSemana(inicioSemana)}</p>
        </div>
        <button onClick={onVolver} className="today-button" style={{ padding: '6px 14px', minHeight: '38px', fontSize: '13px' }}>
          ← Volver
        </button>
      </header>

      <main className="shopping-content">
        {toast && <div className="product-success-message">{toast}</div>}

        <div className="shopping-actions">
          <button onClick={generarLista} className="primary-button" style={{ flex: 1, minWidth: '110px' }}>
            Actualizar lista
          </button>
          <button
            type="button"
            className="add-manual-product-button"
            onClick={abrirNuevoProducto}
          >
            Añadir producto
          </button>
          <button
            type="button"
            className="share-list-button"
            onClick={handleCompartir}
            disabled={!hayContenido}
            style={{ flex: 1, minWidth: '120px', opacity: !hayContenido ? 0.5 : 1 }}
          >
            Compartir lista
          </button>
          <button
            type="button"
            className="copy-list-button"
            onClick={handleCopiar}
            disabled={!hayContenido}
            style={{ flex: 1, minWidth: '110px', opacity: !hayContenido ? 0.5 : 1 }}
          >
            Copiar lista
          </button>
          <button onClick={marcarTodo} className="secondary-button" style={{ flex: 1, minWidth: '110px' }}>
            Marcar todo
          </button>
          <button onClick={desmarcarTodo} className="secondary-button" style={{ flex: 1, minWidth: '110px' }}>
            Desmarcar todo
          </button>
        </div>

        {cargando ? (
          <div className="loading-state">Generando lista de la compra...</div>
        ) : error ? (
          <div className="error-state" style={{ color: '#C0392B' }}>No se pudo generar la lista de la compra</div>
        ) : !hayContenido ? (
          <div className="empty-state">No hay productos en la lista de la compra</div>
        ) : (
          <>
            {Object.keys(elementosPorCategoria).map(cat => (
              <section key={cat} className="shopping-category">
                <h2 className="shopping-category-title">{cat}</h2>
                <div className="shopping-list">
                  {elementosPorCategoria[cat].map(item => {
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

                    return (
                      <label
                        key={item.id}
                        className={`shopping-item ${item.comprado ? 'shopping-item-checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={item.comprado}
                          onChange={() => toggleComprado(item)}
                          className="shopping-checkbox"
                        />
                        <div className="shopping-item-content">
                          <div className="shopping-item-main">
                            <span className="shopping-item-name">
                              {item.nombre}
                              {item.manual && <span className="manual-product-badge">Manual</span>}
                            </span>
                            <span className="shopping-item-quantity">{cantidadFormateada}</span>
                          </div>
                          <div className="shopping-item-origin">
                            {item.manual ? 'Producto manual' : `Plato: ${item.origenes.join(', ')}`}
                          </div>
                          {item.manual && item.productoManualId && (
                            <div className="manual-product-actions">
                              <button
                                type="button"
                                className="manual-product-edit"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const db = await initDB();
                                  const lista = await obtenerProductosManuales(db, inicioSemanaIso);
                                  const prod = lista.find(p => p.id === item.productoManualId);
                                  if (prod) {
                                    setProductoAEditar(prod);
                                    setMostrarDialogo(true);
                                  }
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="manual-product-delete"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  const db = await initDB();
                                  const lista = await obtenerProductosManuales(db, inicioSemanaIso);
                                  const prod = lista.find(p => p.id === item.productoManualId);
                                  if (prod) {
                                    setProductoAEliminar(prod);
                                  }
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}

            {platosSinIngredientes.length > 0 && (
              <section className="missing-dishes-section">
                <h2>Platos sin ingredientes configurados</h2>
                {platosSinIngredientes.map((p, idx) => (
                  <div key={idx} className="missing-dish-card">
                    <strong>{p.fechaFormateada}</strong> &mdash; {p.tipo}: {p.nombrePlato}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {mostrarDialogo && (
        <DialogoProductoManual
          inicioSemanaIso={inicioSemanaIso}
          productoExistente={productoAEditar}
          alCerrar={() => setMostrarDialogo(false)}
          alGuardarExitoso={(mensaje) => {
            setMostrarDialogo(false);
            setProductoAEditar(null);
            mostrarToast(mensaje);
            generarLista();
          }}
        />
      )}

      {productoAEliminar && (
        <div className="dialog-backdrop">
          <div className="dialog-panel" style={{ maxWidth: '400px' }}>
            <h3 className="dialog-title">Eliminar producto</h3>
            <p style={{ margin: '0 0 16px', color: '#383838' }}>¿Quieres eliminar este producto de la lista?</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setProductoAEliminar(null)} className="secondary-button">Cancelar</button>
              <button
                type="button"
                onClick={() => handleEliminarManual(productoAEliminar)}
                className="danger-button"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DialogoProductoManualProps {
  inicioSemanaIso: string;
  productoExistente: ProductoManual | null;
  alCerrar: () => void;
  alGuardarExitoso: (mensaje: string) => void;
}

const DialogoProductoManual: React.FC<DialogoProductoManualProps> = ({
  inicioSemanaIso,
  productoExistente,
  alCerrar,
  alGuardarExitoso
}) => {
  const [nombre, setNombre] = useState(productoExistente?.nombre || '');
  const [cantidadStr, setCantidadStr] = useState(
    productoExistente?.cantidad !== null && productoExistente?.cantidad !== undefined
      ? (productoExistente.cantidad % 1 === 0 ? productoExistente.cantidad.toString() : productoExistente.cantidad.toString().replace('.', ','))
      : ''
  );
  const [unidad, setUnidad] = useState(productoExistente?.unidad || UNIDADES_MANUAL[0]);
  const [categoria, setCategoria] = useState(productoExistente?.categoria || CATEGORIAS_INGREDIENTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<boolean>(false);

  const guardarProductoManual = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (guardando) return;

    const limpioNombre = nombre.trim();
    if (!limpioNombre) {
      setError('El nombre es obligatorio');
      return;
    }

    let cantidadNum: number | null = null;
    const cantTrim = cantidadStr.trim().replace(',', '.');

    if (cantTrim === '') {
      if (unidad !== 'al gusto' && unidad !== 'sin unidad') {
        setError('La cantidad es obligatoria salvo para "al gusto" y "sin unidad"');
        return;
      }
    } else {
      const parsed = parseFloat(cantTrim);
      if (isNaN(parsed) || parsed < 0) {
        setError('Cantidad numérica inválida o negativa');
        return;
      }
      if (unidad !== 'al gusto' && unidad !== 'sin unidad' && parsed <= 0) {
        setError('La cantidad debe ser mayor que cero');
        return;
      }
      cantidadNum = parsed;
    }

    setGuardando(true);
    setError(null);

    try {
      const db = await initDB();
      const duplicado = await existeProductoManualDuplicado(
        db,
        inicioSemanaIso,
        limpioNombre,
        unidad,
        productoExistente?.id
      );

      if (duplicado) {
        setError('Este producto manual ya existe con la misma unidad');
        setGuardando(false);
        return;
      }

      const now = new Date().toISOString();
      const productoFinal: ProductoManual = {
        id: productoExistente?.id || crypto.randomUUID(),
        inicioSemana: inicioSemanaIso,
        nombre: limpioNombre,
        cantidad: cantidadNum,
        unidad,
        categoria,
        comprado: productoExistente?.comprado || false,
        creadoEn: productoExistente?.creadoEn || now,
        actualizadoEn: now
      };

      if (productoExistente) {
        await actualizarProductoManual(db, productoFinal);
        alGuardarExitoso("Producto actualizado");
      } else {
        await añadirProductoManual(db, productoFinal);
        alGuardarExitoso("Producto añadido");
      }
    } catch (e) {
      console.error("Error al guardar producto manual:", e);
      setError("No se pudo guardar el producto");
      setGuardando(false);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel product-dialog" style={{ maxWidth: '440px' }}>
        <h3 className="dialog-title">{productoExistente ? 'Editar producto' : 'Añadir producto'}</h3>

        <form onSubmit={guardarProductoManual} className="product-form">
          <div className="product-form-row">
            <label style={{ fontSize: '13px', fontWeight: '700' }}>Nombre del producto</label>
            <input
              type="text"
              className="text-input"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError(null); }}
              placeholder="Ej. Detergente"
              disabled={guardando}
            />
          </div>

          <div className="product-form-row">
            <label style={{ fontSize: '13px', fontWeight: '700' }}>Cantidad</label>
            <input
              type="text"
              className="text-input"
              value={cantidadStr}
              onChange={e => { setCantidadStr(e.target.value); setError(null); }}
              placeholder="Ej. 1 o 1,5 (opcional para 'al gusto'/'sin unidad')"
              disabled={guardando}
            />
          </div>

          <div className="product-form-row">
            <label style={{ fontSize: '13px', fontWeight: '700' }}>Unidad</label>
            <select
              className="select-input"
              value={unidad}
              onChange={e => { setUnidad(e.target.value); setError(null); }}
              disabled={guardando}
            >
              {UNIDADES_MANUAL.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="product-form-row">
            <label style={{ fontSize: '13px', fontWeight: '700' }}>Categoría</label>
            <select
              className="select-input"
              value={categoria}
              onChange={e => { setCategoria(e.target.value); setError(null); }}
              disabled={guardando}
            >
              {CATEGORIAS_INGREDIENTE.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && <p className="product-validation-error">{error}</p>}

          <div className="dialog-actions" style={{ marginTop: '16px' }}>
            <button type="button" onClick={alCerrar} className="secondary-button" disabled={guardando}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
