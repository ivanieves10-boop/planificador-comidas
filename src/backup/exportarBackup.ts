import { recopilarDatosBackup } from './modelosBackup';

export async function exportarCopiaSeguridad(): Promise<string> {
  const backup = await recopilarDatosBackup();
  const jsonString = JSON.stringify(backup, null, 2);

  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  const hh = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');

  const nombreArchivo = `PlanificadorComidas_${yyyy}-${mm}-${dd}_${hh}${min}.json`;

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  const fechaLegible = ahora.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  localStorage.setItem('ultima_copia_exportada', fechaLegible);

  return fechaLegible;
}
