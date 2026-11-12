import React, { useState } from 'react';
import { ResumenBackup } from '../backup/importarBackup';

interface DialogoImportarBackupProps {
  resumen: ResumenBackup;
  alCerrar: () => void;
  alConfirmar: (modo: 'sustituir' | 'combinar') => void;
  importando: boolean;
}

export const DialogoImportarBackup: React.FC<DialogoImportarBackupProps> = ({
  resumen,
  alCerrar,
  alConfirmar,
  importando
}) => {
  const [modo, setModo] = useState<'sustituir' | 'combinar'>('sustituir');

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel" style={{ maxWidth: '480px' }}>
        <h3 className="dialog-title">Importar copia de seguridad</h3>

        <div className="backup-summary" style={{ background: '#FAFCFA', border: '1px solid #E1E8E2', borderRadius: '12px', padding: '14px', marginBottom: '14px', fontSize: '14px', display: 'grid', gap: '6px' }}>
          <div><strong>Fecha de la copia:</strong> {resumen.fecha}</div>
          <div><strong>Platos en catálogo:</strong> {resumen.totalPlatos}</div>
          <div><strong>Ingredientes:</strong> {resumen.totalIngredientes}</div>
          <div><strong>Días planificados:</strong> {resumen.totalPlanificacion}</div>
          <div><strong>Productos manuales:</strong> {resumen.totalManuales}</div>
          <div><strong>Primer día de semana:</strong> {resumen.primerDiaSemana}</div>
        </div>

        <div className="backup-warning" style={{ background: '#FFF8EE', border: '1px solid #FFE8C2', borderRadius: '12px', padding: '12px', fontSize: '13px', color: '#7F6000', marginBottom: '16px', fontWeight: '600' }}>
          ⚠️ La importación sustituirá los datos actuales de este dispositivo.
        </div>

        <div className="backup-mode-options" style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            <input
              type="radio"
              name="modoImportacion"
              checked={modo === 'sustituir'}
              onChange={() => setModo('sustituir')}
              disabled={importando}
              style={{ accentColor: '#427A58' }}
            />
            <span>Sustituir todos los datos</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            <input
              type="radio"
              name="modoImportacion"
              checked={modo === 'combinar'}
              onChange={() => setModo('combinar')}
              disabled={importando}
              style={{ accentColor: '#427A58' }}
            />
            <span>Combinar con los datos actuales</span>
          </label>
        </div>

        <div className="dialog-actions">
          <button type="button" onClick={alCerrar} className="secondary-button" disabled={importando}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => alConfirmar(modo)}
            className="primary-button"
            disabled={importando}
          >
            {importando ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
};
