import React, { useEffect, useState, useRef } from 'react';
import { DayOfWeekStr } from '../types';
import { initDB } from '../db/db';
import { Diagnostico } from '../components/Diagnostico';
import { exportarCopiaSeguridad } from '../backup/exportarBackup';
import { validarYAnalizarBackup, restaurarBackup, ResumenBackup } from '../backup/importarBackup';
import { DialogoImportarBackup } from '../components/DialogoImportarBackup';
import { BackupData } from '../backup/modelosBackup';

interface ConfiguracionScreenProps {
  onVolver: () => void;
  onConfigUpdated: () => void;
}

const dias: { key: DayOfWeekStr; label: string }[] = [
  { key: 'MONDAY', label: 'Lunes' },
  { key: 'TUESDAY', label: 'Martes' },
  { key: 'WEDNESDAY', label: 'Miércoles' },
  { key: 'THURSDAY', label: 'Jueves' },
  { key: 'FRIDAY', label: 'Viernes' },
  { key: 'SATURDAY', label: 'Sábado' },
  { key: 'SUNDAY', label: 'Domingo' }
];

export const ConfiguracionScreen: React.FC<ConfiguracionScreenProps> = ({ onVolver, onConfigUpdated }) => {
  const [primerDia, setPrimerDia] = useState<DayOfWeekStr>('MONDAY');
  const [personas, setPersonas] = useState<number>(4);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [ultimaCopia, setUltimaCopia] = useState<string>('Nunca');
  const [exportando, setExportando] = useState<boolean>(false);
  const [importando, setImportando] = useState<boolean>(false);
  const [backupPendiente, setBackupPendiente] = useState<{ backup: BackupData; resumen: ResumenBackup } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initDB().then(async db => {
      const config = await db.get('configuracion', 'app_config');
      if (config) {
        setPrimerDia(config.primerDiaSemana);
        if (config.personasHogar) setPersonas(config.personasHogar);
      }
    });

    const guardada = localStorage.getItem('ultima_copia_exportada');
    if (guardada) {
      setUltimaCopia(guardada);
    }
  }, []);

  const handleChangeDia = async (dia: DayOfWeekStr) => {
    setPrimerDia(dia);
    const db = await initDB();
    const config = (await db.get('configuracion', 'app_config')) || { id: 'app_config', primerDiaSemana: dia, personasHogar: personas };
    config.primerDiaSemana = dia;
    await db.put('configuracion', config);
    setMensaje('Primer día de la semana actualizado');
    onConfigUpdated();
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleCambiarPersonas = async (nuevaCantidad: number) => {
    const val = Math.max(1, Math.min(10, nuevaCantidad));
    setPersonas(val);
    const db = await initDB();
    const config = (await db.get('configuracion', 'app_config')) || { id: 'app_config', primerDiaSemana: primerDia, personasHogar: 4 };
    config.personasHogar = val;
    await db.put('configuracion', config);
    setMensaje('Personas del hogar actualizadas');
    onConfigUpdated();
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleExportar = async () => {
    if (exportando) return;
    try {
      setExportando(true);
      setMensaje('Generando copia...');
      const fechaLegible = await exportarCopiaSeguridad();
      setUltimaCopia(fechaLegible);
      setMensaje('Copia de seguridad exportada');
      setTimeout(() => setMensaje(null), 3000);
    } catch (e) {
      console.error("Error al exportar backup:", e);
      setMensaje('No se pudo exportar la copia de seguridad');
      setTimeout(() => setMensaje(null), 3000);
    } finally {
      setExportando(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setMensaje('El archivo supera el tamaño permitido');
      setTimeout(() => setMensaje(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const texto = event.target?.result as string;
      const resultado = validarYAnalizarBackup(texto);
      if (resultado.error) {
        setMensaje(resultado.error);
        setTimeout(() => setMensaje(null), 4000);
      } else if (resultado.backup && resultado.resumen) {
        setBackupPendiente({ backup: resultado.backup, resumen: resultado.resumen });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setMensaje('El archivo no es una copia válida del Planificador de comidas');
      setTimeout(() => setMensaje(null), 4000);
    };
    reader.readAsText(file);
  };

  const handleConfirmarImportacion = async (modo: 'sustituir' | 'combinar') => {
    if (!backupPendiente) return;
    try {
      setImportando(true);
      await restaurarBackup(backupPendiente.backup, modo);
      setBackupPendiente(null);
      setMensaje('Copia de seguridad importada correctamente');
      onConfigUpdated();
      setTimeout(() => {
        setMensaje(null);
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      console.error("Error al restaurar backup:", e);
      setMensaje(e.message || 'No se pudo importar la copia de seguridad');
      setTimeout(() => setMensaje(null), 4000);
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="app-title" style={{ fontSize: '20px' }}>Configuración</h2>
        <button
          onClick={onVolver}
          className="today-button"
          style={{ padding: '6px 12px', minHeight: '36px', fontSize: '13px' }}
        >
          ← Volver
        </button>
      </header>

      <main className="main-content">
        <Diagnostico />

        {mensaje && (
          <div style={{ background: '#E7F1E9', color: '#33663A', border: '1px solid rgba(51,102,58,0.3)', padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', marginBottom: '16px', textAlign: 'center' }}>
            {mensaje}
          </div>
        )}

        <div className="day-card" style={{ marginBottom: '16px' }}>
          <h3 className="day-title">Personas del hogar (Modo Familia)</h3>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>
            Ajusta las cantidades de los ingredientes y de la lista de la compra según los comensales en tu hogar.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => handleCambiarPersonas(personas - 1)}
              disabled={personas <= 1}
              className="primary-button"
              style={{ width: '44px', height: '44px', padding: 0 }}
            >
              -
            </button>
            <span style={{ fontSize: '18px', fontWeight: 750, color: '#315B40' }}>
              {personas} {personas === 1 ? 'persona' : 'personas'}
            </span>
            <button
              type="button"
              onClick={() => handleCambiarPersonas(personas + 1)}
              disabled={personas >= 10}
              className="primary-button"
              style={{ width: '44px', height: '44px', padding: 0 }}
            >
              +
            </button>
          </div>
        </div>

        <div className="day-card" style={{ marginBottom: '16px' }}>
          <h3 className="day-title">Primer día de la semana</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {dias.map(d => (
              <label
                key={d.key}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: '#F5F7F4', cursor: 'pointer', minHeight: '44px' }}
              >
                <span style={{ fontWeight: '600', color: '#315B40' }}>{d.label}</span>
                <input
                  type="radio"
                  name="primerDia"
                  value={d.key}
                  checked={primerDia === d.key}
                  onChange={() => handleChangeDia(d.key)}
                  style={{ width: '20px', height: '20px', accentColor: '#427A58' }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="day-card backup-section" style={{ marginBottom: '16px' }}>
          <h3 className="day-title">Copia de seguridad</h3>
          <p className="backup-description" style={{ fontSize: '13px', color: '#555', marginBottom: '12px', lineHeight: 1.4 }}>
            Los datos se guardan únicamente en este dispositivo. Crea copias de seguridad para trasladarlos o recuperarlos.
          </p>

          <p className="backup-last-date" style={{ fontSize: '13px', fontWeight: '600', color: '#315B40', marginBottom: '12px' }}>
            Última copia exportada: {ultimaCopia}
          </p>

          <div className="backup-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={handleExportar}
              className="primary-button backup-export-button"
              disabled={exportando}
              style={{ flex: 1, minWidth: '130px', fontSize: '13px' }}
            >
              {exportando ? 'Generando copia...' : 'Exportar copia'}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="secondary-button backup-import-button"
              disabled={importando}
              style={{ flex: 1, minWidth: '130px', fontSize: '13px' }}
            >
              Importar copia
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <p style={{ fontSize: '12px', color: '#68766C', lineHeight: 1.4, margin: 0 }}>
            La copia contiene tu planificación, catálogo, ingredientes y listas. Guárdala en un lugar seguro.
          </p>
        </div>

        <div style={{ background: '#FFF8EE', border: '1px solid #FFE8C2', borderRadius: '16px', padding: '16px', fontSize: '13px', color: '#7F6000', lineHeight: 1.5 }}>
          Los datos se guardan únicamente en este dispositivo. Usa la copia de seguridad para trasladarlos o recuperarlos.
        </div>
      </main>

      {backupPendiente && (
        <DialogoImportarBackup
          resumen={backupPendiente.resumen}
          alCerrar={() => setBackupPendiente(null)}
          alConfirmar={handleConfirmarImportacion}
          importando={importando}
        />
      )}
    </div>
  );
};
