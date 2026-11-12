import React, { useState } from 'react';
import { PlanificacionDia, PlatoCatalogo } from '../types';
import { cargarFavoritos } from '../utils/favoritos';
import { MapPin } from 'lucide-react';

interface DialogoEditarCenaProps {
  fecha: string;
  fechaFormateada: string;
  planActual?: PlanificacionDia;
  platosCatalogo: PlatoCatalogo[];
  alCerrar: () => void;
  alGuardar: (nuevoPlan: PlanificacionDia) => void;
}

export const DialogoEditarCena: React.FC<DialogoEditarCenaProps> = ({
  fecha,
  fechaFormateada,
  planActual,
  platosCatalogo,
  alCerrar,
  alGuardar
}) => {
  const [cena, setCena] = useState<string>(planActual?.cena || '');
  const [error, setError] = useState<string | null>(null);
  const [mostrarConfirmacionFuera, setMostrarConfirmacionFuera] = useState<boolean>(false);

  const favsSet = cargarFavoritos();
  const queryLimpio = cena.trim().toLowerCase();

  const sugerencias = queryLimpio === '' ? [] : platosCatalogo
    .filter(p => !p.nombre.toLowerCase().includes('fuera de casa') && p.nombre.toLowerCase().includes(queryLimpio))
    .sort((a, b) => {
      const aStart = a.nombre.toLowerCase().startsWith(queryLimpio);
      const bStart = b.nombre.toLowerCase().startsWith(queryLimpio);
      if (aStart !== bStart) return aStart ? -1 : 1;
      const aFav = favsSet.has(a.nombre.trim().toLowerCase());
      const bFav = favsSet.has(b.nombre.trim().toLowerCase());
      if (aFav !== bFav) return aFav ? -1 : 1;
      return a.nombre.localeCompare(b.nombre, 'es');
    })
    .slice(0, 8);

  const handleGuardar = (fuera: boolean = false) => {
    if (fuera) {
      alGuardar({
        fecha,
        modoComida: planActual?.modoComida || 'UNICO',
        primerPlato: planActual?.primerPlato || '',
        segundoPlato: planActual?.segundoPlato || '',
        cena: '',
        cenaFuera: true,
        actualizadoEn: new Date().toISOString()
      });
      return;
    }

    const limpio = cena.trim();
    if (!limpio) {
      setError('El nombre de la cena no puede estar vacío');
      return;
    }

    alGuardar({
      fecha,
      modoComida: planActual?.modoComida || 'UNICO',
      primerPlato: planActual?.primerPlato || '',
      segundoPlato: planActual?.segundoPlato || '',
      cena: limpio,
      cenaFuera: false,
      actualizadoEn: new Date().toISOString()
    });
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        <h3 className="dialog-title">Editar cena</h3>
        <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#33663A' }}>{fechaFormateada}</p>

        <div className="form-field" style={{ position: 'relative' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>Nombre del plato</label>
          <input
            type="text"
            className="text-input"
            value={cena}
            onChange={e => { setCena(e.target.value); setError(null); }}
          />
          {cena.trim() !== '' && (
            <div className="catalog-picker" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', maxHeight: '180px' }}>
              {sugerencias.length === 0 ? (
                <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>No se encontraron platos</div>
              ) : (
                sugerencias.map(p => (
                  <div
                    key={p.id}
                    className="catalog-option"
                    onClick={() => setCena(p.nombre)}
                  >
                    {p.nombre}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {error && <p style={{ color: '#C0392B', fontSize: '13px', margin: '4px 0 8px' }}>{error}</p>}

        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => {
              if (cena.trim()) {
                setMostrarConfirmacionFuera(true);
              } else {
                handleGuardar(true);
              }
            }}
            className="secondary-button"
            style={{ width: '100%', borderColor: '#B3261E', color: '#B3261E', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <MapPin size={16} />
            <span>Marcar como Fuera de casa</span>
          </button>
        </div>

        <div className="dialog-actions" style={{ marginTop: '16px' }}>
          <button onClick={alCerrar} className="secondary-button">Cancelar</button>
          <button onClick={() => handleGuardar(false)} className="primary-button">Guardar</button>
        </div>
      </div>

      {mostrarConfirmacionFuera && (
        <div className="dialog-backdrop" style={{ zIndex: 60 }}>
          <div className="dialog-panel" style={{ maxWidth: '400px' }}>
            <h3 className="dialog-title">Confirmar cambio</h3>
            <p style={{ margin: '0 0 16px', color: '#383838' }}>La receta asignada se eliminará de esta comida. ¿Continuar?</p>
            <div className="dialog-actions">
              <button onClick={() => setMostrarConfirmacionFuera(false)} className="secondary-button">Cancelar</button>
              <button onClick={() => { setMostrarConfirmacionFuera(false); handleGuardar(true); }} className="primary-button">Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
