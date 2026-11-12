import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './db/supabase';
import { AuthScreen } from './screens/AuthScreen';
import { PlanificadorScreen } from './screens/PlanificadorScreen';
import { CatalogoScreen } from './screens/CatalogoScreen';
import { FavoritasScreen } from './screens/FavoritasScreen';
import { EstadisticasScreen } from './screens/EstadisticasScreen';
import { ListaCompraScreen } from './screens/ListaCompraScreen';
import { ConfiguracionScreen } from './screens/ConfiguracionScreen';
import { PantallaIngredientes } from './screens/PantallaIngredientes';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

export function App() {
  const [session, setSession] = useState<any>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [screen, setScreen] = useState<'PLANIFICADOR' | 'CATALOGO' | 'FAVORITAS' | 'ESTADISTICAS' | 'COMPRA' | 'CONFIGURACION' | 'INGREDIENTES'>('PLANIFICADOR');
  const [platoIngredientesContext, setPlatoIngredientesContext] = useState<{ id: string; nombre: string } | null>(null);
  const [inicioSemanaActual, setInicioSemanaActual] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCargandoAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCargandoAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7F4', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '480px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ color: '#33663A', margin: '0 0 12px' }}>Configuración de Supabase requerida</h2>
          <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5', margin: '0 0 16px' }}>
            Las variables de entorno <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> no están configuradas en Vercel.
          </p>
          <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>
            Ve a tu proyecto en Vercel → <em>Settings</em> → <em>Environment Variables</em>, añade ambas variables con tus credenciales de Supabase y haz un Redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (cargandoAuth) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F7F4', color: '#33663A', fontWeight: 700 }}>Cargando aplicación...</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7F4] text-slate-800">
      {screen === 'PLANIFICADOR' && (
        <PlanificadorScreen
          onNavigate={setScreen}
          refreshTrigger={refreshTrigger}
          onInicioSemanaChange={setInicioSemanaActual}
          onLogout={() => supabase.auth.signOut()}
        />
      )}
      {screen === 'CATALOGO' && (
        <CatalogoScreen
          onVolver={() => setScreen('PLANIFICADOR')}
          onAbrirIngredientes={(id, nombre) => {
            setPlatoIngredientesContext({ id, nombre });
            setScreen('INGREDIENTES');
          }}
        />
      )}
      {screen === 'FAVORITAS' && (
        <FavoritasScreen
          onVolver={() => setScreen('PLANIFICADOR')}
          onAbrirIngredientes={(id, nombre) => {
            setPlatoIngredientesContext({ id, nombre });
            setScreen('INGREDIENTES');
          }}
        />
      )}
      {screen === 'ESTADISTICAS' && (
        <EstadisticasScreen
          onVolver={() => setScreen('PLANIFICADOR')}
        />
      )}
      {screen === 'INGREDIENTES' && platoIngredientesContext && (
        <PantallaIngredientes
          platoId={platoIngredientesContext.id}
          platoNombre={platoIngredientesContext.nombre}
          alVolver={() => setScreen('CATALOGO')}
        />
      )}
      {screen === 'COMPRA' && (
        <ListaCompraScreen
          inicioSemana={inicioSemanaActual}
          onVolver={() => setScreen('PLANIFICADOR')}
        />
      )}
      {screen === 'CONFIGURACION' && (
        <ConfiguracionScreen
          onVolver={() => setScreen('PLANIFICADOR')}
          onConfigUpdated={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
      <PwaUpdatePrompt />
    </div>
  );
}

export default App;
