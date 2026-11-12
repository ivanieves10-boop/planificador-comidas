import React from 'react';
import { Settings, List, ShoppingCart, Heart, BarChart2, Sparkles, LogOut } from 'lucide-react';

interface CabeceraProps {
  onNavigate: (screen: 'PLANIFICADOR' | 'CATALOGO' | 'FAVORITAS' | 'ESTADISTICAS' | 'COMPRA' | 'CONFIGURACION') => void;
  onExportarExcel: () => void;
  onGenerarMenu: () => void;
  onLogout: () => void;
}

export const Cabecera: React.FC<CabeceraProps> = ({ onNavigate, onExportarExcel, onGenerarMenu, onLogout }) => {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="app-title">Planificador de comidas</h1>
          <p className="app-subtitle">Organiza el menú familiar de la semana</p>
        </div>
        <button
          onClick={onLogout}
          className="header-action"
          title="Cerrar sesión"
          style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 0, padding: '6px 10px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>
      </div>

      <div className="header-actions" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <button
          onClick={() => onNavigate('CONFIGURACION')}
          className="header-action"
          title="Configuración"
        >
          <Settings size={15} />
          <span>Config.</span>
        </button>
        <button
          onClick={() => onNavigate('CATALOGO')}
          className="header-action"
          title="Catálogo"
        >
          <List size={15} />
          <span>Platos</span>
        </button>
        <button
          onClick={() => onNavigate('FAVORITAS')}
          className="header-action"
          title="Favoritas"
        >
          <Heart size={15} color="#C0392B" fill="#C0392B" />
          <span>Favs</span>
        </button>
        <button
          onClick={() => onNavigate('ESTADISTICAS')}
          className="header-action"
          title="Estadísticas"
        >
          <BarChart2 size={15} />
          <span>Stats</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
        <button
          type="button"
          onClick={() => onNavigate('COMPRA')}
          className="header-action"
          style={{ background: 'white', color: '#315B40', minHeight: '38px', fontWeight: 700, fontSize: '12px' }}
        >
          <ShoppingCart size={14} />
          <span>Compra</span>
        </button>
        <button
          type="button"
          onClick={onGenerarMenu}
          className="header-action"
          style={{ background: 'white', color: '#315B40', minHeight: '38px', fontWeight: 700, fontSize: '12px' }}
        >
          <Sparkles size={14} />
          <span>Generar</span>
        </button>
        <button
          type="button"
          onClick={onExportarExcel}
          className="header-action"
          style={{ background: 'white', color: '#315B40', minHeight: '38px', fontWeight: 700, fontSize: '12px' }}
        >
          <span>Excel</span>
        </button>
      </div>
    </header>
  );
};
