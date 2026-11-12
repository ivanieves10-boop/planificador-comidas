import React, { useEffect, useState } from 'react';
import { Cabecera } from '../components/Cabecera';
import { SelectorSemana } from '../components/SelectorSemana';
import { DialogoEditarComida } from '../components/DialogoEditarComida';
import { DialogoEditarCena } from '../components/DialogoEditarCena';
import { DialogoExportarExcel } from '../components/DialogoExportarExcel';
import { DialogoGenerarMenuWeb } from '../components/DialogoGenerarMenuWeb';
import { calcularInicioSemana, formatearFechaEspanol } from '../utils/calculoSemana';
import { initDB } from '../db/db';
import { PlanificacionDia, PlatoCatalogo } from '../types';
import { recopilarDatosExportacion, OpcionesExportacion } from '../exportacion/modelosExportacion';
import { generarYDescargarExcel } from '../exportacion/generarExcel';
import { MapPin } from 'lucide-react';

interface PlanificadorScreenProps {
  onNavigate: (screen: 'PLANIFICADOR' | 'CATALOGO' | 'FAVORITAS' | 'ESTADISTICAS' | 'COMPRA' | 'CONFIGURACION') => void;
  refreshTrigger: number;
  onInicioSemanaChange?: (date: Date) => void;
  onLogout: () => void;
}

const PREDETERMINADOS_SEMANA: Record<string, { comida: string; cena: string }> = {
  MONDAY: { comida: 'Fuera de casa', cena: 'Tortilla y ensalada' },
  TUESDAY: { comida: 'Fuera de casa', cena: 'Pescado con verduras' },
  WEDNESDAY: { comida: 'Fuera de casa', cena: 'Crema de calabacín' },
  THURSDAY: { comida: 'Fuera de casa', cena: 'Pollo al horno' },
  FRIDAY: { comida: 'Fuera de casa', cena: 'Pizza casera' },
  SATURDAY: { comida: 'Arroz', cena: 'Hamburguesas' },
  SUNDAY: { comida: 'Pollo asado', cena: 'Sopa' }
};

export const PlanificadorScreen: React.FC<PlanificadorScreenProps> = ({ onNavigate, refreshTrigger, onInicioSemanaChange, onLogout }) => {
  const [desplazamiento, setDesplazamiento] = useState<number>(0);
  const [inicioSemana, setInicioSemana] = useState<Date>(new Date());
  const [diasSemana, setDiasSemana] = useState<Date[]>([]);
  const [planes, setPlanes] = useState<Record<string, PlanificacionDia>>({});
  const [platosCatalogo, setPlatosCatalogo] = useState<PlatoCatalogo[]>([]);
  const [comidaEditando, setComidaEditando] = useState<{ fecha: string; formateada: string } | null>(null);
  const [cenaEditando, setCenaEditando] = useState<{ fecha: string; formateada: string } | null>(null);
  const [mostrarDialogoExportar, setMostrarDialogoExportar] = useState<boolean>(false);
  const [mostrarDialogoGenerar, setMostrarDialogoGenerar] = useState<boolean>(false);
  const [generandoExcel, setGenerandoExcel] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState<boolean>(false);

  const mostrarToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const cargarDatos = async () => {
    const db = await initDB();
    const config = await db.get('configuracion', 'app_config');
    const primerDiaVal = config?.primerDiaSemana || 'MONDAY';

    const base = calcularInicioSemana(new Date(), primerDiaVal);
    const targetInicio = new Date(base);
    targetInicio.setDate(targetInicio.getDate() + (desplazamiento * 7));
    setInicioSemana(targetInicio);
    onInicioSemanaChange?.(targetInicio);

    const arrDias: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(targetInicio);
      d.setDate(d.getDate() + i);
      arrDias.push(d);
    }
    setDiasSemana(arrDias);

    const excluidosStore = db.transaction('platosPredeterminadosExcluidos', 'readonly').objectStore('platosPredeterminadosExcluidos');
    const excluidosList = await excluidosStore.getAll();
    const nombresExcluidos = new Set(excluidosList.map(e => e.nombre.toLowerCase().trim()));

    const platosStore = db.transaction('platos', 'readonly').objectStore('platos');
    const allPlatos = await platosStore.getAll();
    const platosValidos = allPlatos.filter(p => !p.predeterminado || !nombresExcluidos.has(p.nombre.toLowerCase().trim()));
    platosValidos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    setPlatosCatalogo(platosValidos);

    const planStore = db.transaction('planificacion', 'readwrite').objectStore('planificacion');
    const planMap: Record<string, PlanificacionDia> = {};
    const nowIso = new Date().toISOString();

    for (const d of arrDias) {
      const fechaStr = d.toISOString().split('T')[0];
      let res = await planStore.get(fechaStr);
      if (!res) {
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const dayKey = dayNames[d.getDay()];
        const def = PREDETERMINADOS_SEMANA[dayKey] || { comida: 'Fuera de casa', cena: 'Tortilla y ensalada' };

        res = {
          fecha: fechaStr,
          modoComida: 'UNICO',
          primerPlato: def.comida,
          segundoPlato: '',
          cena: def.cena,
          actualizadoEn: nowIso
        };
        await planStore.put(res);
      }
      planMap[fechaStr] = res;
    }
    setPlanes(planMap);
    setDbReady(true);
  };

  useEffect(() => {
    cargarDatos();
  }, [desplazamiento, refreshTrigger]);

  const handleGuardarPlan = async (nuevoPlan: PlanificacionDia) => {
    const db = await initDB();
    await db.put('planificacion', nuevoPlan);
    setComidaEditando(null);
    setCenaEditando(null);
    cargarDatos();
  };

  const handleAplicarMenuGenerado = async (nuevoPlanMapa: Map<string, { comida: string; cena: string }>) => {
    try {
      const db = await initDB();
      const planStore = db.transaction('planificacion', 'readwrite').objectStore('planificacion');
      const nowIso = new Date().toISOString();

      for (const [fechaStr, vals] of nuevoPlanMapa.entries()) {
        const existente = (await planStore.get(fechaStr)) || {
          fecha: fechaStr,
          modoComida: 'UNICO',
          primerPlato: '',
          segundoPlato: '',
          cena: '',
          actualizadoEn: nowIso
        };

        existente.comidaFuera = false;
        existente.cenaFuera = false;
        existente.modoComida = 'UNICO';
        existente.primerPlato = vals.comida;
        existente.segundoPlato = '';
        existente.cena = vals.cena;
        existente.actualizadoEn = nowIso;

        await planStore.put(existente);
      }
      setMostrarDialogoGenerar(false);
      mostrarToast("Menú semanal aplicado correctamente");
      cargarDatos();
    } catch (e) {
      console.error(e);
      mostrarToast("No se pudo aplicar el menú generado");
    }
  };

  const handleGenerarExcel = async (opciones: OpcionesExportacion) => {
    try {
      setGenerandoExcel(true);
      const datos = await recopilarDatosExportacion(inicioSemana);
      if (datos.diasPlan.length === 0 && datos.elementosCompra.length === 0) {
        mostrarToast("No hay datos para exportar");
        setGenerandoExcel(false);
        setMostrarDialogoExportar(false);
        return;
      }
      await generarYDescargarExcel(datos, opciones);
      mostrarToast("Excel generado correctamente");
    } catch (e) {
      console.error("Error al generar Excel:", e);
      mostrarToast("No se pudo generar el archivo Excel");
    } finally {
      setGenerandoExcel(false);
      setMostrarDialogoExportar(false);
    }
  };

  const handleAnterior = () => setDesplazamiento(prev => prev - 1);
  const handleHoy = () => setDesplazamiento(0);
  const handleSiguiente = () => setDesplazamiento(prev => prev + 1);

  if (!dbReady) return null;

  const hoyStr = new Date().toISOString().split('T')[0];

  return (
    <div className="app-shell">
      <Cabecera
        onNavigate={onNavigate}
        onExportarExcel={() => setMostrarDialogoExportar(true)}
        onGenerarMenu={() => setMostrarDialogoGenerar(true)}
        onLogout={onLogout}
      />
      <SelectorSemana
        inicioSemana={inicioSemana}
        desplazamiento={desplazamiento}
        onAnterior={handleAnterior}
        onHoy={handleHoy}
        onSiguiente={handleSiguiente}
      />

      <main className="main-content">
        {toast && <div className="product-success-message">{toast}</div>}

        <div className="day-list">
          {diasSemana.map(dia => {
            const fechaStr = dia.toISOString().split('T')[0];
            const plan = planes[fechaStr];
            const fechaFormateada = formatearFechaEspanol(dia);
            const esHoy = fechaStr === hoyStr;

            const comidaFuera = plan?.comidaFuera || plan?.primerPlato?.trim().toLowerCase() === 'fuera de casa';
            const cenaFuera = plan?.cenaFuera || plan?.cena?.trim().toLowerCase() === 'fuera de casa';

            return (
              <article key={fechaStr} className="day-card" style={esHoy ? { background: '#EAF3EC', border: '2px solid #33663A' } : undefined}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 className="day-title" style={{ margin: 0 }}>{fechaFormateada}</h2>
                  {esHoy && (
                    <span style={{ background: '#33663A', color: 'white', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                      HOY
                    </span>
                  )}
                </div>

                <div className="meal-row" style={{ borderBottom: '1px solid #F0F4F1' }}>
                  <span className="meal-label meal-label-food">Comida</span>
                  <div className="meal-name">
                    {comidaFuera ? (
                      <div style={{ background: '#F9DEDC', border: '1px solid #B3261E', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#410E0B', fontWeight: 700 }}>
                        <MapPin size={16} />
                        <div>
                          <div>FUERA DE CASA</div>
                          <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>No hay nada que gestionar</div>
                        </div>
                      </div>
                    ) : plan?.modoComida === 'DOS_PLATOS' ? (
                      <div>
                        <div>1.º {plan.primerPlato || 'Sin asignar'}</div>
                        <div>2.º {plan.segundoPlato || 'Sin asignar'}</div>
                      </div>
                    ) : (
                      <div>{plan?.primerPlato || 'Fuera de casa'}</div>
                    )}
                  </div>
                  <button
                    className="edit-button"
                    onClick={() => setComidaEditando({ fecha: fechaStr, formateada: fechaFormateada })}
                  >
                    Editar
                  </button>
                </div>

                <div className="meal-row">
                  <span className="meal-label meal-label-dinner">Cena</span>
                  <div className="meal-name">
                    {cenaFuera ? (
                      <div style={{ background: '#F9DEDC', border: '1px solid #B3261E', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#410E0B', fontWeight: 700 }}>
                        <MapPin size={16} />
                        <div>
                          <div>FUERA DE CASA</div>
                          <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>No hay nada que gestionar</div>
                        </div>
                      </div>
                    ) : (
                      plan?.cena || 'Tortilla y ensalada'
                    )}
                  </div>
                  <button
                    className="edit-button"
                    onClick={() => setCenaEditando({ fecha: fechaStr, formateada: fechaFormateada })}
                  >
                    Editar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {comidaEditando && (
        <DialogoEditarComida
          fecha={comidaEditando.fecha}
          fechaFormateada={comidaEditando.formateada}
          planActual={planes[comidaEditando.fecha]}
          platosCatalogo={platosCatalogo}
          alCerrar={() => setComidaEditando(null)}
          alGuardar={handleGuardarPlan}
        />
      )}

      {cenaEditando && (
        <DialogoEditarCena
          fecha={cenaEditando.fecha}
          fechaFormateada={cenaEditando.formateada}
          planActual={planes[cenaEditando.fecha]}
          platosCatalogo={platosCatalogo}
          alCerrar={() => setCenaEditando(null)}
          alGuardar={handleGuardarPlan}
        />
      )}

      {mostrarDialogoExportar && (
        <DialogoExportarExcel
          alCerrar={() => setMostrarDialogoExportar(false)}
          alGenerar={handleGenerarExcel}
          generando={generandoExcel}
        />
      )}

      {mostrarDialogoGenerar && (
        <DialogoGenerarMenuWeb
          inicioSemana={inicioSemana}
          alCerrar={() => setMostrarDialogoGenerar(false)}
          alAplicar={handleAplicarMenuGenerado}
        />
      )}
    </div>
  );
};
