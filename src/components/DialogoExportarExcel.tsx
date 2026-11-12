import React, { useState } from 'react';
import { OpcionesExportacion } from '../exportacion/modelosExportacion';

interface DialogoExportarExcelProps {
  alCerrar: () => void;
  alGenerar: (opciones: OpcionesExportacion) => void;
  generando: boolean;
}

export const DialogoExportarExcel: React.FC<DialogoExportarExcelProps> = ({
  alCerrar,
  alGenerar,
  generando
}) => {
  const [planificacion, setPlanificacion] = useState<boolean>(true);
  const [listaCompra, setListaCompra] = useState<boolean>(true);
  const [catalogo, setCatalogo] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleGenerar = () => {
    if (!planificacion && !listaCompra && !catalogo) {
      setError('Selecciona al menos una hoja');
      return;
    }
    setError(null);
    alGenerar({ planificacion, listaCompra, catalogo });
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel export-dialog" style={{ maxWidth: '440px' }}>
        <h3 className="dialog-title">Exportar a Excel</h3>

        <div className="export-options">
          <label className="export-option">
            <input
              type="checkbox"
              checked={planificacion}
              onChange={e => { setPlanificacion(e.target.checked); setError(null); }}
              disabled={generando}
              style={{ width: '20px', height: '20px', accentColor: '#427A58' }}
            />
            <span style={{ fontWeight: '600', color: '#263A2B' }}>Planificación semanal</span>
          </label>

          <label className="export-option">
            <input
              type="checkbox"
              checked={listaCompra}
              onChange={e => { setListaCompra(e.target.checked); setError(null); }}
              disabled={generando}
              style={{ width: '20px', height: '20px', accentColor: '#427A58' }}
            />
            <span style={{ fontWeight: '600', color: '#263A2B' }}>Lista de la compra</span>
          </label>

          <label className="export-option">
            <input
              type="checkbox"
              checked={catalogo}
              onChange={e => { setCatalogo(e.target.checked); setError(null); }}
              disabled={generando}
              style={{ width: '20px', height: '20px', accentColor: '#427A58' }}
            />
            <span style={{ fontWeight: '600', color: '#263A2B' }}>Catálogo e ingredientes</span>
          </label>
        </div>

        {error && <p className="product-validation-error">{error}</p>}

        <div className="export-actions">
          <button type="button" onClick={alCerrar} className="secondary-button" disabled={generando}>
            Cancelar
          </button>
          <button type="button" onClick={handleGenerar} className="primary-button export-button" disabled={generando}>
            {generando ? 'Generando Excel...' : 'Generar Excel'}
          </button>
        </div>
      </div>
    </div>
  );
};
