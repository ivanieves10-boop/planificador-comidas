import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: '#315B40',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '14px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      width: 'min(100% - 24px, 400px)',
      fontSize: '14px',
      fontWeight: '600'
    }}>
      <span style={{ flex: 1 }}>Hay una nueva versión disponible</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: 'white',
          color: '#315B40',
          border: 0,
          borderRadius: '8px',
          padding: '6px 12px',
          fontWeight: '700',
          cursor: 'pointer',
          minHeight: '36px'
        }}
      >
        Actualizar
      </button>
    </div>
  );
}
