import React, { useState, useRef } from 'react';
import { PlanificacionDia, PlatoCatalogo } from '../types';
import { cargarFavoritos } from '../utils/favoritos';
import { MapPin } from 'lucide-react';

interface DialogoEditarComidaProps {
  fecha: string;
  fechaFormateada: string;
  planActual?: PlanificacionDia;
  platosCatalogo: PlatoCatalogo[];
  alCerrar: () => void;
  alGuardar: (nuevoPlan: PlanificacionDia) => void;
}

export const DialogoEditarComida: React.FC<DialogoEditarComidaProps> = ({
  fecha,
  fechaFormateada,
  planActual,
  platosCatalogo,
  alCerrar,
  alGuardar
}) => {
  const [modo, setModo] = useState<'UNICO' | 'DOS_PLATOS'>(planActual?.modoComida || 'UNICO');
  const [primerPlato, setPrimerPlato] = useState<string>(planActual?.primerPlato || '');
  const [segundoPlato, setSegundoPlato] = useState<string>(planActual?.segundoPlato || '');
  const [campoActivo, setCampoActivo] = useState<'PRIMERO' | 'SEGUNDO'>('PRIMERO');
  const [error, setError] = useState<string | null>(null);
  const [mostrarConfirmacionFuera, setMostrarConfirmacionFuera] = useState<boolean>(false);

  const primerInputRef = useRef<HTMLInputElement>(null);
  const segundoInputRef = useRef<HTMLInputElement>(null);

  const favsSet = cargarFavoritos();

  const getSugerencias = (query: string) => {
    const limpio = query.trim().toLowerCase();
    if (!limpio) return [];
    return platosCatalogo
      .filter(p => !p.nombre.toLowerCase().includes('fuera de casa') && p.nombre.toLowerCase().includes(limpio))
      .sort((a, b) => {
        const aStart = a.nombre.toLowerCase().startsWith(limpio);
        const bStart = b.nombre.toLowerCase().startsWith(limpio);
        if (aStart !== bStart) return aStart ? -1 : 1;
        const aFav = favsSet.has(a.nombre.trim().toLowerCase());
        const bFav = favsSet.has(b.nombre.trim().toLowerCase());
        if (aFav !== bFav) return aFav ? -1 : 1;
        return a.nombre.localeCompare(b.nombre, 'es');
      })
      .slice(0, 8);
  };

  const sugerenciasPrimero = getSugerencias(primerPlato);
  const sugerenciasSegundo = getSugerencias(segundoPlato);

  const handleGuardar = (fuera: boolean = false) => {
    if (fuera) {
      alGuardar({
        fecha,
        modoComida: modo,
        primerPlato: '',
        segundoPlato: '',
        cena: planActual?.cena || '',
        comidaFuera: true,
        actualizadoEn: new Date().toISOString()
      });
      return;
    }

    const p1 = primerPlato.trim();
    const p2 = segundoPlato.trim();

    if (modo === 'UNICO' && !p1) {
      setError('El primer plato no puede estar vacío');
      return;
    }
    if (modo === 'DOS_PLATOS' && (!p1 || !p2)) {
      setError('Tanto el primer como el segundo plato deben estar completados');
      return;
    }

    alGuardar({
      fecha,
      modoComida: modo,
      primerPlato: p1,
      segundoPlato: modo === 'DOS_PLATOS' ? p2 : '',
      cena: planActual?.cena || '',
      comidaFuera: false,
      actualizadoEn: new Date().toISOString()
    });
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel" style={{ maxHeight: '90dvh', overflowY: 'auto' }}>
        <h3 className="dialog-title">Editar comida</h3>
        <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: '600', color: '#33663A' }}>{fechaFormateada}</p>

        <div className="form-field">
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>Tipo de comida</label>
          <div className="radio-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="modoComida"
                checked={modo === 'UNICO'}
                onChange={() => { setModo('UNICO'); setError(null); }}
                style={{ accentColor: '#427A58' }}
              />
              <span>Plato único</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="modoComida"
                checked={modo === 'DOS_PLATOS'}
                onChange={() => { setModo('DOS_PLATOS'); setError(null); }}
                style={{ accentColor: '#427A58' }}
              />
              <span>Primer plato y segundo plato</span>
            </label>
          </div>
        </div>

        {modo === 'UNICO' ? (
          <div className="form-field" style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>Nombre del plato</label>
            <input
              ref={primerInputRef}
              type="text"
              className="text-input"
              value={primerPlato}
              onChange={e => { setPrimerPlato(e.target.value); setError(null); setCampoActivo('PRIMERO'); }}
              onFocus={() => setCampoActivo('PRIMERO')}
            />
            {campoActivo === 'PRIMERO' && primerPlato.trim() !== '' && (
              <div className="catalog-picker" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', maxHeight: '180px' }}>
                {sugerenciasPrimero.length === 0 ? (
                  <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>No se encontraron platos</div>
                ) : (
                  sugerenciasPrimero.map(p => (
                    <div
                      key={p.id}
                      className="catalog-option"
                      onClick={() => { setPrimerPlato(p.nombre); }}
                    >
                      {p.nombre}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="form-field" style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>Primer plato</label>
              <input
                ref={primerInputRef}
                type="text"
                className="text-input"
                value={primerPlato}
                onChange={e => { setPrimerPlato(e.target.value); setError(null); setCampoActivo('PRIMERO'); }}
                onFocus={() => setCampoActivo('PRIMERO')}
              />
              {campoActivo === 'PRIMERO' && primerPlato.trim() !== '' && (
                <div className="catalog-picker" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', maxHeight: '180px' }}>
                  {sugerenciasPrimero.length === 0 ? (
                    <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>No se encontraron platos</div>
                  ) : (
                    sugerenciasPrimero.map(p => (
                      <div
                        key={p.id}
                        className="catalog-option"
                        onClick={() => { setPrimerPlato(p.nombre); }}
                      >
                        {p.nombre}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="form-field" style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>Segundo plato</label>
              <input
                ref={segundoInputRef}
                type="text"
                className="text-input"
                value={segundoPlato}
                onChange={e => { setSegundoPlato(e.target.value); setError(null); setCampoActivo('SEGUNDO'); }}
                onFocus={() => setCampoActivo('SEGUNDO')}
              />
              {campoActivo === 'SEGUNDO' && segundoPlato.trim() !== '' && (
                <div className="catalog-picker" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'white', maxHeight: '180px' }}>
                  {sugerenciasSegundo.length === 0 ? (
                    <div style={{ padding: '10px', fontSize: '12px', color: '#666' }}>No se encontraron platos</div>
                  ) : (
                    sugerenciasSegundo.map(p => (
                      <div
                        key={p.id}
                        className="catalog-option"
                        onClick={() => { setSegundoPlato(p.nombre); }}
                      >
                        {p.nombre}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {error && <p style={{ color: '#C0392B', fontSize: '13px', margin: '4px 0 8px' }}>{error}</p>}

        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => {
              if (primerPlato.trim() || segundoPlato.trim()) {
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
