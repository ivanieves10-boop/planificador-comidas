import React, { useState, useEffect } from 'react';
import { calcularEstadisticas, DatosEstadisticas, PeriodoEstadisticas } from '../utils/estadisticas';
import { BarChart2, Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EstadisticasScreenProps {
  onVolver: () => void;
}

export const EstadisticasScreen: React.FC<EstadisticasScreenProps> = ({ onVolver }) => {
  const [periodo, setPeriodo] = useState<PeriodoEstadisticas>('30D');
  const [datos, setDatos] = useState<DatosEstadisticas | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    calcularEstadisticas(periodo)
      .then(res => {
        if (activo) {
          setDatos(res);
          setCargando(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, [periodo]);

  return (
    <div className="app-shell">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="app-title" style={{ fontSize: '20px' }}>Estadísticas</h2>
        <button
          onClick={onVolver}
          className="today-button"
          style={{ padding: '6px 12px', minHeight: '36px', fontSize: '13px' }}
        >
          ← Volver
        </button>
      </header>

      <main className="main-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '16px' }}>
          {(['7D', '30D', '3M', 'TODO'] as PeriodoEstadisticas[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              style={{
                padding: '8px 4px',
                borderRadius: '10px',
                border: periodo === p ? '2px solid #427A58' : '1px solid #DDE6DF',
                background: periodo === p ? '#E7F1E9' : 'white',
                color: periodo === p ? '#315B40' : '#555',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {p === '7D' ? '7 días' : p === '30D' ? '30 días' : p === '3M' ? '3 meses' : 'Historial'}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="loading-state">Calculando estadísticas...</div>
        ) : !datos || datos.totalComidas === 0 ? (
          <div className="empty-state" style={{ padding: '40px 16px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #E1E8E2' }}>
            <BarChart2 size={48} color="#A8C5B0" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#666', fontSize: '15px', fontWeight: 600 }}>
              Todavía no hay suficientes menús planificados para mostrar estadísticas
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* Tarjeta 1: Resumen */}
            <div className="day-card">
              <h3 className="day-title">Resumen del periodo</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', margin: '12px 0' }}>
                <div style={{ background: '#F5F7F4', padding: '10px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Comidas</div>
                  <div style={{ fontSize: '18px', fontWeight: 750, color: '#315B40' }}>{datos.totalComidas}</div>
                </div>
                <div style={{ background: '#F5F7F4', padding: '10px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Distintas</div>
                  <div style={{ fontSize: '18px', fontWeight: 750, color: '#315B40' }}>{datos.recetasDiferentes}</div>
                </div>
                <div style={{ background: '#F5F7F4', padding: '10px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Variedad</div>
                  <div style={{ fontSize: '18px', fontWeight: 750, color: '#427A58' }}>{datos.porcentajeVariedad.toFixed(1)}%</div>
                </div>
              </div>

              {datos.comparativa && (
                <div style={{ background: '#E7F1E9', padding: '12px', borderRadius: '12px', fontSize: '13px', color: '#314A36', marginTop: '12px', display: 'grid', gap: '4px' }}>
                  <strong>Comparativa vs periodo anterior:</strong>
                  <div>• {datos.comparativa.difPorcentajeVariedad >= 0 ? '+' : ''}{datos.comparativa.difPorcentajeVariedad.toFixed(1)}% de variedad</div>
                  <div>• {datos.comparativa.difTotalComidas >= 0 ? `${datos.comparativa.difTotalComidas} comidas más planificadas` : `${Math.abs(datos.comparativa.difTotalComidas)} comidas menos planificadas`}</div>
                  <div>• {datos.comparativa.recetasNuevasUtilizadas} recetas nuevas utilizadas</div>
                </div>
              )}

              {datos.recetaMasUtilizada && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #E1E8E2', paddingTop: '10px', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Receta estrella:</span>{' '}
                  <strong>{datos.recetaMasUtilizada.nombre}</strong> ({datos.recetaMasUtilizada.apariciones} veces)
                </div>
              )}
            </div>

            {/* Tarjeta 2: Equilibrio semanal */}
            <div className="day-card">
              <h3 className="day-title">Equilibrio semanal</h3>
              <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                {Object.entries({
                  'Carne': datos.equilibrio.carne,
                  'Pescado': datos.equilibrio.pescado,
                  'Verdura': datos.equilibrio.verdura,
                  'Legumbres': datos.equilibrio.legumbres,
                  'Pasta': datos.equilibrio.pasta,
                  'Arroz': datos.equilibrio.arroz,
                  'Otros': datos.equilibrio.otros
                }).map(([nombre, count]) => (
                  <div key={nombre} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ fontWeight: 600, color: '#315B40' }}>{nombre}</span>
                    <span style={{ color: '#555', fontWeight: 600 }}>{count} {count === 1 ? 'vez' : 'veces'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tarjeta 3: Top 5 Recetas */}
            {datos.top5Recetas.length > 0 && (
              <div className="day-card">
                <h3 className="day-title">Top 5 recetas más utilizadas</h3>
                <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                  {datos.top5Recetas.map((rec, idx) => (
                    <div key={rec.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#427A58' }}>{idx + 1}.</span>
                        <span style={{ fontWeight: 600, color: '#263A2B' }}>{rec.nombre}</span>
                        {rec.esFavorita && <Heart size={14} color="#C0392B" fill="#C0392B" />}
                      </div>
                      <span style={{ color: '#666', fontSize: '13px' }}>{rec.apariciones} veces</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tarjeta 4: Distribución por Categorías */}
            {datos.distribucionCategorias.length > 0 && (
              <div className="day-card">
                <h3 className="day-title">Distribución por categorías</h3>
                <div style={{ display: 'grid', gap: '10px', marginTop: '10px' }}>
                  {datos.distribucionCategorias.map(cat => (
                    <div key={cat.nombre} style={{ display: 'grid', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                        <span style={{ color: '#315B40' }}>{cat.nombre}</span>
                        <span style={{ color: '#666' }}>{cat.cantidad} ({cat.porcentaje.toFixed(1)}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#E7F1E9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, cat.porcentaje))}%`, height: '100%', background: '#427A58', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tarjeta 5: Recetas olvidadas */}
            {datos.recetasOlvidadas.length > 0 && (
              <div className="day-card">
                <h3 className="day-title">Recetas olvidadas (sin usar &gt; 60 días)</h3>
                <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                  {datos.recetasOlvidadas.slice(0, 10).map(olv => (
                    <div key={olv.nombre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: '#263A2B' }}>{olv.nombre}</span>
                        {olv.esFavorita && <Heart size={14} color="#C0392B" fill="#C0392B" />}
                      </div>
                      <span style={{ color: '#888', fontSize: '12px' }}>
                        {olv.diasSinUsar === null ? 'Nunca utilizada' : `Hace ${olv.diasSinUsar} días`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
