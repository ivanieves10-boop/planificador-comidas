import React, { useState } from 'react';
import { supabase } from '../db/supabase';

export const AuthScreen: React.FC = () => {
  const [modo, setModo] = useState<'LOGIN' | 'REGISTER' | 'RECOVER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setCargando(true);

    try {
      if (modo === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (modo === 'REGISTER') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMensaje('Registro exitoso. Revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión.');
      } else if (modo === 'RECOVER') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setMensaje('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error en la autenticación');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: 'min(100%, 420px)', background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 750, color: '#33663A', textAlign: 'center' }}>Planificador de comidas</h1>
        <p style={{ margin: '0 0 20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
          {modo === 'LOGIN' ? 'Inicia sesión en tu cuenta' : modo === 'REGISTER' ? 'Crea una nueva cuenta' : 'Recupera tu contraseña'}
        </p>

        {mensaje && (
          <div style={{ background: '#E7F1E9', color: '#33663A', border: '1px solid rgba(51,102,58,0.3)', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
            {mensaje}
          </div>
        )}

        {error && (
          <div style={{ background: '#FDF2F2', color: '#C0392B', border: '1px solid rgba(192,57,43,0.3)', padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: '#263A2B' }}>Correo electrónico</label>
            <input
              type="email"
              required
              className="text-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              disabled={cargando}
            />
          </div>

          {modo !== 'RECOVER' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '4px', color: '#263A2B' }}>Contraseña</label>
              <input
                type="password"
                required
                className="text-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={cargando}
              />
            </div>
          )}

          <button type="submit" className="primary-button" style={{ width: '100%', marginTop: '6px' }} disabled={cargando}>
            {cargando ? 'Procesando...' : modo === 'LOGIN' ? 'Iniciar sesión' : modo === 'REGISTER' ? 'Registrarse' : 'Enviar enlace'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px' }}>
          {modo !== 'LOGIN' ? (
            <button type="button" onClick={() => { setModo('LOGIN'); setError(null); setMensaje(null); }} style={{ background: 'none', border: 0, color: '#427A58', fontWeight: 700, cursor: 'pointer' }}>
              ← Iniciar sesión
            </button>
          ) : (
            <button type="button" onClick={() => { setModo('REGISTER'); setError(null); setMensaje(null); }} style={{ background: 'none', border: 0, color: '#427A58', fontWeight: 700, cursor: 'pointer' }}>
              Crear cuenta
            </button>
          )}

          {modo !== 'RECOVER' && (
            <button type="button" onClick={() => { setModo('RECOVER'); setError(null); setMensaje(null); }} style={{ background: 'none', border: 0, color: '#666', cursor: 'pointer' }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
