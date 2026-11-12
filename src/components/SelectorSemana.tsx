import React from 'react';
import { formatearIntervaloSemana } from '../utils/calculoSemana';

interface SelectorSemanaProps {
  inicioSemana: Date;
  desplazamiento: number;
  onAnterior: () => void;
  onHoy: () => void;
  onSiguiente: () => void;
}

export const SelectorSemana: React.FC<SelectorSemanaProps> = ({
  inicioSemana,
  desplazamiento,
  onAnterior,
  onHoy,
  onSiguiente
}) => {
  return (
    <div className="main-content" style={{ paddingBottom: 0, paddingTop: '16px' }}>
      <h2 className="week-title">
        {desplazamiento === 0 ? 'Esta semana' : formatearIntervaloSemana(inicioSemana)}
      </h2>
      <div className="week-navigation">
        <button
          onClick={onAnterior}
          className="navigation-button"
        >
          ‹
        </button>
        <button
          onClick={onHoy}
          disabled={desplazamiento === 0}
          className="today-button"
        >
          Hoy
        </button>
        <button
          onClick={onSiguiente}
          className="navigation-button"
        >
          ›
        </button>
      </div>
    </div>
  );
};
