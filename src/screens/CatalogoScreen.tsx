import React, { useEffect, useState } from 'react';
import { initDB, inicializarCatalogoPredeterminado, CATALOGO_INICIAL_NOMBRES } from '../db/db';
import { PlatoCatalogo } from '../types';
import { cargarFavoritos, toggleFavorito } from '../utils/favoritos';
import { Heart } from 'lucide-react';

interface CatalogoScreenProps {
  onVolver: () => void;
  onAbrirIngredientes: (id: string, nombre: string) => void;
}

export const CatalogoScreen: React.FC<CatalogoScreenProps> = ({ onVolver, onAbrirIngredientes }) => {
  const [platos, setPlatos] = useState<PlatoCatalogo[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorDb, setErrorDb] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');
  const [soloFavoritas, setSoloFavoritas] = useState<boolean>(false);
  const [favoritosSet, setFavoritosSet] = useState<Set<string>>(new Set());

  const [mostrarAnadir, setMostrarAnadir] = useState<boolean>(false);
  const [platoAEditar, setPlatoAEditar] = useState<PlatoCatalogo | null>(null);
  const [platoAEliminar, setPlatoAEliminar] = useState<PlatoCatalogo | null>(null);
  const [mostrarRestaurar, setMostrarRestaurar] = useState<boolean>(false);

  const cargarCatalogo = async () => {
    try {
      setCargando(true);
      setErrorDb(null);
      const db = await initDB();
      await inicializarCatalogoPredeterminado(db);

      const excluidosStore = db.transaction('platosPredeterminadosExcluidos', 'readonly').objectStore('platosPredeterminadosExcluidos');
      const excluidosList = await excluidosStore.getAll();
      const nombresExcluidos = new Set(excluidosList.map(e => e.nombre.toLowerCase().trim()));

      const store = db.transaction('platos', 'readonly').objectStore('platos');
      const all = await store.getAll();
      const validos = all.filter(p => !p.predeterminado || !nombresExcluidos.has(p.nombre.toLowerCase().trim()));
      validos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

      setPlatos(validos);
      setFavoritosSet(cargarFavoritos());
    } catch (e: any) {
      console.error("Error al cargar catálogo:", e);
      setErrorDb("Error al cargar el catálogo desde la base de datos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const handleToggleFav = (nombre: string) => {
    toggleFavorito(nombre);
    setFavoritosSet(cargarFavoritos());
  };

  const platosFiltrados = platos
    .filter(p => {
      const pasaTexto = p.nombre.toLowerCase().includes(busqueda.toLowerCase().trim());
      const esFav = favoritosSet.has(p.nombre.trim().toLowerCase());
      const pasaFav = !soloFavoritas || esFav;
      return pasaTexto && pasaFav;
    })
    .sort((a, b) => {
      const aFav = favoritosSet.has(a.nombre.trim().toLowerCase());
      const bFav = favoritosSet.has(b.nombre.trim().toLowerCase());
      if (aFav !== bFav) return aFav ? -1 : 1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });

  const handleEliminar = async () => {
    if (!platoAEliminar) return;
    try {
      const db = await initDB();
      const tx = db.transaction(['platos', 'platosPredeterminadosExcluidos'], 'readwrite');
      await tx.objectStore('platos').delete(platoAEliminar.id);

      if (platoAEliminar.predeterminado) {
        await tx.objectStore('platosPredeterminadosExcluidos').put({
          nombre: platoAEliminar.nombre.trim().toLowerCase()
        });
      }
      await tx.done;

      setPlatoAEliminar(null);
      cargarCatalogo();
    } catch (e) {
      console.error("Error al eliminar plato:", e);
    }
  };

  const handleRestaurar = async () => {
    try {
      const db = await initDB();
      const tx = db.transaction(['platos', 'platosPredeterminadosExcluidos'], 'readwrite');
      await tx.objectStore('platosPredeterminadosExcluidos').clear();

      const allPlatos = await tx.objectStore('platos').getAll();
      const nombresExistentes = new Set(allPlatos.map(p => p.nombre.toLowerCase().trim()));
      const now = new Date().toISOString();

      for (const nombreInit of CATALOGO_INICIAL_NOMBRES) {
        if (!nombresExistentes.has(nombreInit.toLowerCase().trim())) {
          await tx.objectStore('platos').put({
            id: crypto.randomUUID(),
            nombre: nombreInit,
            predeterminado: true,
            creadoEn: now,
            actualizadoEn: now
          });
          nombresExistentes.add(nombreInit.toLowerCase().trim());
        }
      }
      await tx.done;

      setMostrarRestaurar(false);
      cargarCatalogo();
    } catch (e) {
      console.error("Error al restaurar platos:", e);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="app-title" style={{ fontSize: '20px' }}>Catálogo de platos</h2>
        <button onClick={onVolver} className="today-button" style={{ padding: '6px 12px', minHeight: '36px', fontSize: '13px' }}>
          ← Volver
        </button>
      </header>

      <main className="main-content">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setMostrarRestaurar(true)}
            className="secondary-button"
            style={{ flex: 1, fontSize: '13px', padding: '8px' }}
          >
            Restaurar predeterminados
          </button>
          <button
            onClick={() => setMostrarAnadir(true)}
            className="primary-button"
            style={{ flex: 1, fontSize: '13px', padding: '8px' }}
          >
            + Añadir plato
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setSoloFavoritas(false)}
            className={!soloFavoritas ? "primary-button" : "secondary-button"}
            style={{ flex: 1, fontSize: '13px', padding: '6px', minHeight: '38px' }}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setSoloFavoritas(true)}
            className={soloFavoritas ? "primary-button" : "secondary-button"}
            style={{ flex: 1, fontSize: '13px', padding: '6px', minHeight: '38px' }}
          >
            ❤️ Favoritas
          </button>
        </div>

        <div className="form-field" style={{ marginBottom: '14px' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar plato..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {cargando ? (
          <div className="empty-state">Cargando catálogo...</div>
        ) : errorDb ? (
          <div className="empty-state" style={{ color: '#C0392B' }}>{errorDb}</div>
        ) : platosFiltrados.length === 0 ? (
          <div className="empty-state">No hay platos en el catálogo</div>
        ) : (
          <div className="day-list">
            {platosFiltrados.map(p => {
              const esFav = favoritosSet.has(p.nombre.trim().toLowerCase());
              return (
                <div key={p.id} className="day-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleFav(p.nombre)}
                      style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: '4px' }}
                    >
                      <Heart size={18} color="#C0392B" fill={esFav ? '#C0392B' : 'none'} />
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#315B40' }}>{p.nombre}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="edit-button"
                      onClick={() => onAbrirIngredientes(p.id, p.nombre)}
                    >
                      Ingredientes
                    </button>
                    <button
                      className="edit-button"
                      onClick={() => setPlatoAEditar(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="edit-button"
                      style={{ color: '#C0392B' }}
                      onClick={() => setPlatoAEliminar(p)}
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

      {mostrarAnadir && (
        <DialogoAnadirPlato
          platosActuales={platos}
          alCerrar={() => setMostrarAnadir(false)}
          alGuardar={async (nuevoNombre) => {
            const db = await initDB();
            const now = new Date().toISOString();
            await db.put('platos', {
              id: crypto.randomUUID(),
              nombre: nuevoNombre,
              predeterminado: false,
              creadoEn: now,
              actualizadoEn: now
            });
            setMostrarAnadir(false);
            cargarCatalogo();
          }}
        />
      )}

      {platoAEditar && (
        <DialogoEditarPlato
          plato={platoAEditar}
          platosActuales={platos}
          alCerrar={() => setPlatoAEditar(null)}
          alGuardar={async (id, nuevoNombre) => {
            const db = await initDB();
            const platoObj = await db.get('platos', id);
            if (platoObj) {
              const nombreAntiguo = platoObj.nombre;
              platoObj.nombre = nuevoNombre;
              platoObj.actualizadoEn = new Date().toISOString();
              await db.put('platos', platoObj);

              if (platoObj.predeterminado && nombreAntiguo.toLowerCase().trim() !== nuevoNombre.toLowerCase().trim()) {
                await db.put('platosPredeterminadosExcluidos', { nombre: nombreAntiguo.trim().toLowerCase() });
              }
            }
            setPlatoAEditar(null);
            cargarCatalogo();
          }}
        />
      )}

      {platoAEliminar && (
        <div className="dialog-backdrop">
          <div className="dialog-panel" style={{ maxWidth: '400px' }}>
            <h3 className="dialog-title">Eliminar plato</h3>
            <p style={{ margin: '0 0 16px', color: '#383838' }}>¿Quieres eliminar este plato del catálogo?</p>
            <div className="dialog-actions">
              <button onClick={() => setPlatoAEliminar(null)} className="secondary-button">Cancelar</button>
              <button onClick={handleEliminar} className="danger-button">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarRestaurar && (
        <div className="dialog-backdrop">
          <div className="dialog-panel" style={{ maxWidth: '400px' }}>
            <h3 className="dialog-title">Restaurar platos predeterminados</h3>
            <p style={{ margin: '0 0 16px', color: '#383838' }}>¿Quieres restaurar los platos predeterminados que has eliminado?</p>
            <div className="dialog-actions">
              <button onClick={() => setMostrarRestaurar(false)} className="secondary-button">Cancelar</button>
              <button onClick={handleRestaurar} className="primary-button">Restaurar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DialogoAnadirPlatoProps {
  platosActuales: PlatoCatalogo[];
  alCerrar: () => void;
  alGuardar: (nombre: string) => void;
}

const DialogoAnadirPlato: React.FC<DialogoAnadirPlatoProps> = ({ platosActuales, alCerrar, alGuardar }) => {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGuardar = () => {
    const limpio = nombre.trim();
    if (!limpio) {
      setError('El nombre no puede estar vacío');
      return;
    }
    const duplicado = platosActuales.some(p => p.nombre.toLowerCase().trim() === limpio.toLowerCase());
    if (duplicado) {
      setError('El plato ya existe en el catálogo');
      return;
    }
    alGuardar(limpio);
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel" style={{ maxWidth: '400px' }}>
        <h3 className="dialog-title">Añadir nuevo plato</h3>
        <div className="form-field">
          <input
            type="text"
            className="text-input"
            placeholder="Nombre del plato"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setError(null); }}
          />
        </div>
        {error && <p style={{ color: '#C0392B', fontSize: '13px', margin: '4px 0 8px' }}>{error}</p>}
        <div className="dialog-actions">
          <button onClick={alCerrar} className="secondary-button">Cancelar</button>
          <button onClick={handleGuardar} className="primary-button">Guardar</button>
        </div>
      </div>
    </div>
  );
};

interface DialogoEditarPlatoProps {
  plato: PlatoCatalogo;
  platosActuales: PlatoCatalogo[];
  alCerrar: () => void;
  alGuardar: (id: string, nuevoNombre: string) => void;
}

const DialogoEditarPlato: React.FC<DialogoEditarPlatoProps> = ({ plato, platosActuales, alCerrar, alGuardar }) => {
  const [nombre, setNombre] = useState(plato.nombre);
  const [error, setError] = useState<string | null>(null);

  const handleGuardar = () => {
    const limpio = nombre.trim();
    if (!limpio) {
      setError('El nombre no puede estar vacío');
      return;
    }
    const duplicado = platosActuales.some(p => p.id !== plato.id && p.nombre.toLowerCase().trim() === limpio.toLowerCase());
    if (duplicado) {
      setError('El plato ya existe en el catálogo');
      return;
    }
    alGuardar(plato.id, limpio);
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel" style={{ maxWidth: '400px' }}>
        <h3 className="dialog-title">Editar plato</h3>
        <div className="form-field">
          <input
            type="text"
            className="text-input"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setError(null); }}
          />
        </div>
        {error && <p style={{ color: '#C0392B', fontSize: '13px', margin: '4px 0 8px' }}>{error}</p>}
        <div className="dialog-actions">
          <button onClick={alCerrar} className="secondary-button">Cancelar</button>
          <button onClick={handleGuardar} className="primary-button">Guardar</button>
        </div>
      </div>
    </div>
  );
};
