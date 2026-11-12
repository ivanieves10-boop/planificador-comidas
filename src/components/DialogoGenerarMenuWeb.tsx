import React, { useState, useEffect } from 'react';
import { initDB, obtenerPlatosCatalogo, obtenerIngredientesPorPlato } from '../db/db';
import { PlatoCatalogo } from '../types';
import { cargarFavoritos } from '../utils/favoritos';
import { normalizarCategoria } from '../utils/categorias';

interface DialogoGenerarMenuWebProps {
  inicioSemana: Date;
  alCerrar: () => void;
  alAplicar: (nuevoPlan: Map<string, { comida: string; cena: string }>) => void;
}

export const DialogoGenerarMenuWeb: React.FC<DialogoGenerarMenuWebProps> = ({ inicioSemana, alCerrar, alAplicar }) => {
  const [modo, setModo] = useState<'EQUILIBRADO' | 'PRIORIZAR_FAVORITAS' | 'SOLO_FAVORITAS'>('EQUILIBRADO');
  const [propuesta, setPropuesta] = useState<{ fechaIso: string; fechaFormateada: string; comida: string; cena: string }[]>([]);
  const [advertencia, setAdvertencia] = useState<string | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);

  const calcularPropuesta = async (selectedModo: 'EQUILIBRADO' | 'PRIORIZAR_FAVORITAS' | 'SOLO_FAVORITAS') => {
    setCargando(true);
    try {
      const db = await initDB();
      const catalogo = await obtenerPlatosCatalogo(db);
      const platosValidos = catalogo.filter(p => !p.nombre.toLowerCase().includes('fuera de casa') && p.nombre.trim() !== '');

      if (platosValidos.length === 0) {
        setPropuesta([]);
        setAdvertencia("No hay platos disponibles en el catálogo.");
        setCargando(false);
        return;
      }

      const favsSet = cargarFavoritos();
      const favs = platosValidos.filter(p => favsSet.has(p.nombre.trim().toLowerCase()));
      const noFavs = platosValidos.filter(p => !favsSet.has(p.nombre.trim().toLowerCase()));

      let pool: PlatoCatalogo[] = [];
      let adv: string | null = null;

      if (selectedModo === 'SOLO_FAVORITAS') {
        if (favs.length < 14) {
          adv = `No hay suficientes recetas favoritas únicas (${favs.length}) para cubrir los 14 servicios sin repetir. Se reutilizarán algunas recetas.`;
        }
        if (favs.length === 0) {
          setPropuesta([]);
          setAdvertencia("No tienes ninguna receta marcada como favorita.");
          setCargando(false);
          return;
        }
        pool = [...favs];
      } else if (selectedModo === 'PRIORIZAR_FAVORITAS') {
        const shuffledFavs = [...favs].sort(() => Math.random() - 0.5);
        const shuffledNoFavs = [...noFavs].sort(() => Math.random() - 0.5);
        pool = [...shuffledFavs.slice(0, 9), ...shuffledNoFavs.slice(0, 14 - Math.min(9, favs.length))];
        while (pool.length < 14 && platosValidos.length > 0) {
          pool.push(platosValidos[Math.floor(Math.random() * platosValidos.length)]);
        }
        pool.sort(() => Math.random() - 0.5);
      } else {
        pool = [...platosValidos].sort(() => Math.random() - 0.5);
      }

      setAdvertencia(adv);

      const catMap = new Map<string, string>();
      for (const p of platosValidos) {
        const ings = await obtenerIngredientesPorPlato(db, p.id);
        if (ings.length > 0) {
          const counts = new Map<string, number>();
          for (const ing of ings) {
            const c = normalizarCategoria(ing.categoria);
            counts.set(c, (counts.get(c) || 0) + 1);
          }
          let topC = "Otros";
          let maxC = -1;
          for (const [c, cnt] of counts) {
            if (cnt > maxC) {
              maxC = cnt;
              topC = c;
            }
          }
          catMap.set(p.nombre.trim().toLowerCase(), topC);
        } else {
          catMap.set(p.nombre.trim().toLowerCase(), "Otros");
        }
      }

      const poolConCat = pool.map(p => ({ plato: p.nombre, cat: catMap.get(p.nombre.trim().toLowerCase()) || "Otros" }));

      const resPropuesta: { fechaIso: string; fechaFormateada: string; comida: string; cena: string }[] = [];
      let ultimaCatComida: string | null = null;
      let ultimaCatCena: string | null = null;

      const seleccionarEvitando = (ultimaCat: string | null) => {
        if (poolConCat.length === 0) return "Arroz";
        if (ultimaCat) {
          const idx = poolConCat.findIndex(item => item.cat !== ultimaCat);
          if (idx !== -1) {
            const elegido = poolConCat.splice(idx, 1)[0];
            poolConCat.push(elegido);
            return elegido.plato;
          }
        }
        const elegido = poolConCat.shift()!;
        poolConCat.push(elegido);
        return elegido.plato;
      };

      for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(d.getDate() + i);
        const fechaIso = d.toISOString().split('T')[0];
        const opcionesFmt: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
        const fStr = d.toLocaleDateString('es-ES', opcionesFmt);
        const fechaFormateada = fStr.charAt(0).toUpperCase() + fStr.slice(1);

        const comida = seleccionarEvitando(ultimaCatComida);
        ultimaCatComida = catMap.get(comida.trim().toLowerCase()) || "Otros";

        const cena = seleccionarEvitando(ultimaCatCena);
        ultimaCatCena = catMap.get(cena.trim().toLowerCase()) || "Otros";

        resPropuesta.push({ fechaIso, fechaFormateada, comida, cena });
      }

      setPropuesta(resPropuesta);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    calcularPropuesta(modo);
  }, [modo]);

  const handleConfirmar = () => {
    if (advertencia && modo === 'SOLO_FAVORITAS' && !mostrarAviso) {
      setMostrarAviso(true);
      return;
    }
    const mapa = new Map<string, { comida: string; cena: string }>();
    for (const item of propuesta) {
      mapa.set(item.fechaIso, { comida: item.comida, cena: item.cena });
    }
    alAplicar(mapa);
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel" style={{ maxWidth: '520px', maxHeight: '90dvh' }}>
        <h3 className="dialog-title">Generar menú semanal</h3>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#315B40' }}>Modo de generación:</label>
          <div style={{ display: 'grid', gap: '6px' }}>
            {(['EQUILIBRADO', 'PRIORIZAR_FAVORITAS', 'SOLO_FAVORITAS'] as const).map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="modoGen"
                  checked={modo === m}
                  onChange={() => setModo(m)}
                  style={{ accentColor: '#427A58' }}
                />
                <span>{m === 'EQUILIBRADO' ? 'Menú equilibrado' : m === 'PRIORIZAR_FAVORITAS' ? 'Priorizar favoritas' : 'Solo favoritas'}</span>
              </label>
            ))}
          </div>
        </div>

        {advertencia && modo === 'SOLO_FAVORITAS' && (
          <div style={{ background: '#FFF9E8', border: '1px solid #E7D7A7', borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#765A00', marginBottom: '12px', fontWeight: 600 }}>
            {advertencia}
          </div>
        )}

        <div style={{ fontSize: '14px', fontWeight: 700, color: '#315B40', marginBottom: '6px' }}>Vista previa de la propuesta:</div>

        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E1E8E2', borderRadius: '12px', padding: '10px', background: '#FAFCFA', display: 'grid', gap: '8px', marginBottom: '16px' }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '13px' }}>Generando propuesta...</div>
          ) : propuesta.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#C0392B', fontSize: '13px' }}>{advertencia || 'Sin platos disponibles'}</div>
          ) : (
            propuesta.map(item => (
              <div key={item.fechaIso} style={{ background: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid #EFEFEF', fontSize: '13px' }}>
                <div style={{ fontWeight: 700, color: '#33663A', marginBottom: '2px' }}>{item.fechaFormateada}</div>
                <div style={{ color: '#383838' }}>• Comida: <strong>{item.comida}</strong></div>
                <div style={{ color: '#383838' }}>• Cena: <strong>{item.cena}</strong></div>
              </div>
            ))
          )}
        </div>

        {mostrarAviso && (
          <div style={{ background: '#FFF9E8', border: '1px solid #E7D7A7', borderRadius: '12px', padding: '12px', marginBottom: '12px', fontSize: '13px', color: '#765A00' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{advertencia}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setMostrarAviso(false)} className="secondary-button" style={{ padding: '6px 12px', minHeight: '36px', fontSize: '12px' }}>Cancelar</button>
              <button type="button" onClick={() => {
                const mapa = new Map<string, { comida: string; cena: string }>();
                for (const item of propuesta) {
                  mapa.set(item.fechaIso, { comida: item.comida, cena: item.cena });
                }
                alAplicar(mapa);
              }} className="primary-button" style={{ padding: '6px 12px', minHeight: '36px', fontSize: '12px' }}>Continuar</button>
            </div>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" onClick={alCerrar} className="secondary-button">Cancelar</button>
          <button type="button" onClick={handleConfirmar} className="primary-button" disabled={cargando || propuesta.length === 0}>
            Aplicar menú
          </button>
        </div>
      </div>
    </div>
  );
};
