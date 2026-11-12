import React, { useState, useEffect } from 'react';
import { initDB, obtenerPlatosCatalogo } from '../db/db';
import { PlatoCatalogo } from '../types';
import { cargarFavoritos, toggleFavorito } from '../utils/favoritos';
import { Heart } from 'lucide-react';

interface FavoritasScreenProps {
  onVolver: () => void;
  onAbrirIngredientes: (id: string, nombre: string) => void;
}

export const FavoritasScreen: React.FC<FavoritasScreenProps> = ({ onVolver, onAbrirIngredientes }) => {
  const [platos, setPlatos] = useState<PlatoCatalogo[]>([]);
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState<boolean>(true);

  const cargar = async () => {
    try {
      const db = await initDB();
      const catalogo = await obtenerPlatosCatalogo(db);
      setPlatos(catalogo);
      setFavoritos(cargarFavoritos());
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleToggle = (nombre: string) => {
    toggleFavorito(nombre);
    setFavoritos(cargarFavoritos());
  };

  const platosFavoritos = platos
    .filter(p => favoritos.has(p.nombre.trim().toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <div className="app-shell">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="app-title" style={{ fontSize: '20px' }}>Mis favoritas ❤️</h2>
        <button
          onClick={onVolver}
          className="today-button"
          style={{ padding: '6px 12px', minHeight: '36px', fontSize: '13px' }}
        >
          ← Volver
        </button>
      </header>

      <main className="main-content">
        {cargando ? (
          <div className="loading-state">Cargando favoritas...</div>
        ) : platosFavoritos.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px', textAlign: 'center', color: '#666' }}>
            Aún no tienes recetas favoritas.<br /><br />
            Marca el icono de corazón en tus recetas del catálogo para verlas aquí.
          </div>
        ) : (
          <div className="day-list">
            {platosFavoritos.map(plato => (
              <article key={plato.id} className="day-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => handleToggle(plato.nombre)}
                    style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: '4px' }}
                  >
                    <Heart size={20} color="#C0392B" fill="#C0392B" />
                  </button>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#315B40' }}>{plato.nombre}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onAbrirIngredientes(plato.id, plato.nombre)}
                  className="secondary-button"
                  style={{ padding: '4px 10px', fontSize: '13px', minHeight: '36px' }}
                >
                  🍽 Ingredientes
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
