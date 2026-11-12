import React, { useEffect, useState } from 'react';

export const Diagnostico: React.FC = () => {
  const [info, setInfo] = useState({
    esPwa: false,
    idbOk: false,
    swEstado: 'comprobando...',
    versionEsquema: 1
  });

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const idbAvailable = typeof window !== 'undefined' && 'indexedDB' in window;

    let swStatus = 'no soportado';
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setInfo(prev => ({ ...prev, swEstado: 'activo' }));
      }).catch(() => {
        setInfo(prev => ({ ...prev, swEstado: 'inactivo' }));
      });
      swStatus = navigator.serviceWorker.controller ? 'activo' : 'registrado / inactivo';
    }

    setInfo({
      esPwa: isStandalone,
      idbOk: idbAvailable,
      swEstado: swStatus,
      versionEsquema: 1
    });
  }, []);

  return (
    <div className="bg-white border border-[#427A58]/20 rounded-xl p-3 text-xs text-slate-600 shadow-sm mb-4">
      <h3 className="font-bold text-[#427A58] mb-1">Panel de Diagnóstico PWA</h3>
      <ul className="space-y-1">
        <li>• Modo PWA Instalada: <span className="font-semibold">{info.esPwa ? 'Sí (Standalone)' : 'No (Navegador web)'}</span></li>
        <li>• IndexedDB Disponible: <span className="font-semibold">{info.idbOk ? 'Sí' : 'No'}</span></li>
        <li>• Service Worker: <span className="font-semibold">{info.swEstado}</span></li>
        <li>• Versión del Esquema DB: <span className="font-semibold">v{info.versionEsquema}</span></li>
      </ul>
    </div>
  );
};
