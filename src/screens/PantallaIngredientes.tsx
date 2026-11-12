import React, { useEffect, useState } from 'react';
import { Ingrediente, UNIDADES_INGREDIENTE, CATEGORIAS_INGREDIENTE } from '../types';
import { initDB, obtenerIngredientesPorPlato, añadirIngrediente, actualizarIngrediente, eliminarIngrediente, existeIngredienteDuplicado } from '../db/db';

interface PantallaIngredientesProps {
  platoId: string;
  platoNombre: string;
  alVolver: () => void;
}

export const PantallaIngredientes: React.FC<PantallaIngredientesProps> = ({
  platoId,
  platoNombre,
  alVolver
}) => {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  const [mostrarDialogo, setMostrarDialogo] = useState<boolean>(false);
  const [ingredienteAEditar, setIngredienteAEditar] = useState<Ingrediente | null>(null);
  const [ingredienteAEliminar, setIngredienteAEliminar] = useState<Ingrediente | null>(null);

  const cargarIngredientes = async () => {
    try {
      setCargando(true);
      const db = await initDB();
      const lista = await obtenerIngredientesPorPlato(db, platoId);
      setIngredientes(lista);
      console.log(`Ingredientes recargados: ${lista.length}`);
    } catch (e) {
      console.error("Error al cargar ingredientes:", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarIngredientes();
  }, [platoId]);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="ingredients-screen">
      <header className="ingredients-header">
        <div>
          <h2 className="app-title" style={{ fontSize: '20px' }}>Ingredientes</h2>
          <p className="app-subtitle" style={{ margin: '2px 0 0' }}>{platoNombre}</p>
        </div>
        <button type="button" onClick={alVolver} className="today-button" style={{ padding: '6px 12px', minHeight: '36px', fontSize: '13px' }}>
          ← Volver
        </button>
      </header>

      <main className="main-content">
        {toast && (
          <div style={{ background: '#E7F1E9', color: '#33663A', border: '1px solid rgba(51,102,58,0.3)', padding: '10px 14px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
            {toast}
          </div>
        )}

        <button
          type="button"
          onClick={() => { setIngredienteAEditar(null); setMostrarDialogo(true); }}
          className="add-ingredient-button"
        >
          + Añadir ingrediente
        </button>

        {cargando ? (
          <div className="empty-state">Cargando ingredientes...</div>
        ) : ingredientes.length === 0 ? (
          <div className="empty-state">Este plato todavía no tiene ingredientes</div>
        ) : (
          <div className="ingredients-list">
            {ingredientes.map(ing => {
              const cantFormateada = ing.cantidad !== null
                ? (ing.cantidad % 1 === 0 ? ing.cantidad.toString() : ing.cantidad.toString().replace('.', ','))
                : '';
              const detalle = cantFormateada ? `${cantFormateada} ${ing.unidad}` : ing.unidad;

              return (
                <div key={ing.id} className="ingredient-card">
                  <div>
                    <h3 className="ingredient-name">{ing.nombre}</h3>
                    <p className="ingredient-details">{detalle}</p>
                    <span className="ingredient-category">{ing.categoria}</span>
                  </div>
                  <div className="ingredient-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => { setIngredienteAEditar(ing); setMostrarDialogo(true); }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="edit-button"
                      style={{ color: '#C0392B' }}
                      onClick={() => setIngredienteAEliminar(ing)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {mostrarDialogo && (
        <DialogoFormularioIngrediente
          platoId={platoId}
          ingredienteExistente={ingredienteAEditar}
          alCerrar={() => setMostrarDialogo(false)}
          alGuardarExitoso={(mensajeExito, nuevaLista) => {
            setIngredientes(nuevaLista);
            setMostrarDialogo(false);
            setIngredienteAEditar(null);
            mostrarToast(mensajeExito);
          }}
        />
      )}

      {ingredienteAEliminar && (
        <div className="dialog-backdrop">
          <div className="dialog-panel" style={{ maxWidth: '400px' }}>
            <h3 className="dialog-title">Eliminar ingrediente</h3>
            <p style={{ margin: '0 0 16px', color: '#383838' }}>¿Quieres eliminar este ingrediente?</p>
            <div className="dialog-actions">
              <button type="button" onClick={() => setIngredienteAEliminar(null)} className="secondary-button">Cancelar</button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const db = await initDB();
                    await eliminarIngrediente(db, ingredienteAEliminar.id);
                    setIngredienteAEliminar(null);
                    mostrarToast("Ingrediente eliminado");
                    await cargarIngredientes();
                  } catch (e) {
                    console.error("Error al eliminar ingrediente:", e);
                  }
                }}
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

interface DialogoFormularioIngredienteProps {
  platoId: string;
  ingredienteExistente: Ingrediente | null;
  alCerrar: () => void;
  alGuardarExitoso: (mensaje: string, nuevaLista: Ingrediente[]) => void;
}

const DialogoFormularioIngrediente: React.FC<DialogoFormularioIngredienteProps> = ({
  platoId,
  ingredienteExistente,
  alCerrar,
  alGuardarExitoso
}) => {
  const [nombre, setNombre] = useState(ingredienteExistente?.nombre || '');
  const [cantidadStr, setCantidadStr] = useState(
    ingredienteExistente?.cantidad !== null && ingredienteExistente?.cantidad !== undefined
      ? (ingredienteExistente.cantidad % 1 === 0 ? ingredienteExistente.cantidad.toString() : ingredienteExistente.cantidad.toString().replace('.', ','))
      : ''
  );
  const [unidad, setUnidad] = useState(ingredienteExistente?.unidad || UNIDADES_INGREDIENTE[0]);
  const [categoria, setCategoria] = useState(ingredienteExistente?.categoria || CATEGORIAS_INGREDIENTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<boolean>(false);

  const guardarIngrediente = async (event?: React.FormEvent) => {
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
      if (unidad !== 'al gusto') {
        setError('La cantidad es obligatoria salvo para "al gusto"');
        return;
      }
    } else {
      const parsed = parseFloat(cantTrim);
      if (isNaN(parsed) || parsed < 0) {
        setError('Cantidad numérica inválida o negativa');
        return;
      }
      if (unidad !== 'al gusto' && parsed <= 0) {
        setError('La cantidad debe ser mayor que cero');
        return;
      }
      cantidadNum = parsed;
    }

    setGuardando(true);
    setError(null);

    try {
      const db = await initDB();
      const duplicado = await existeIngredienteDuplicado(
        db,
        platoId,
        limpioNombre,
        unidad,
        ingredienteExistente?.id
      );

      if (duplicado) {
        setError('Este ingrediente ya existe con la misma unidad');
        setGuardando(false);
        return;
      }

      const now = new Date().toISOString();
      const ingredienteFinal: Ingrediente = {
        id: ingredienteExistente?.id || crypto.randomUUID(),
        platoId,
        nombre: limpioNombre,
        cantidad: cantidadNum,
        unidad,
        categoria,
        creadoEn: ingredienteExistente?.creadoEn || now,
        actualizadoEn: now
      };

      if (ingredienteExistente) {
        await actualizarIngrediente(db, ingredienteFinal);
      } else {
        await añadirIngrediente(db, ingredienteFinal);
      }

      const ingredientesActualizados = await obtenerIngredientesPorPlato(db, platoId);
      console.log("Diálogo cerrado");

      const mensajeExito = ingredienteExistente ? "Ingrediente actualizado" : "Ingrediente guardado";
      alGuardarExitoso(mensajeExito, ingredientesActualizados);
    } catch (e) {
      console.error("Error al guardar ingrediente:", e);
      setError("No se pudo guardar el ingrediente");
      setGuardando(false);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel" style={{ maxWidth: '440px' }}>
        <h3 className="dialog-title">{ingredienteExistente ? 'Editar ingrediente' : 'Añadir ingrediente'}</h3>

        <form onSubmit={guardarIngrediente} className="ingredient-form">
          <div className="form-row">
            <label style={{ fontSize: '13px', fontWeight: '700' }}>Nombre del ingrediente</label>
            <input
              type="text"
              className="text-input"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError(null); }}
              placeholder="Ej. Patatas"
              disabled={guardando}
            />
          </div>

          <div className="form-row">
            <label style={{ fontSize: '13px', fontWeight: '700' }}>Cantidad</label>
            <input
              type="text"
              className="text-input"
              value={cantidadStr}
              onChange={e => { setCantidadStr(e.target.value); setError(null); }}
              placeholder="Ej. 500 o 1,5 (opcional para 'al gusto')"
              disabled={guardando}
            />
          </div>

          <div className="form-row">
            <label style={{ fontSize: '13px', fontWeight: '700' }}>Unidad</label>
            <select
              className="select-input"
              value={unidad}
              onChange={e => { setUnidad(e.target.value); setError(null); }}
              disabled={guardando}
            >
              {UNIDADES_INGREDIENTE.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
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

          {error && <p className="validation-message">{error}</p>}

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
