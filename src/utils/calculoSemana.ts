import { DayOfWeekStr } from '../types';

const dayMap: Record<DayOfWeekStr, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7
};

export function calcularInicioSemana(fechaRef: Date, primerDiaStr: DayOfWeekStr): Date {
  const targetDay = dayMap[primerDiaStr] || 1;
  const d = new Date(fechaRef);
  d.setHours(0, 0, 0, 0);

  let currentDay = d.getDay();
  let isoCurrent = currentDay === 0 ? 7 : currentDay;

  let diff = isoCurrent - targetDay;
  if (diff < 0) {
    diff += 7;
  }
  d.setDate(d.getDate() - diff);
  return d;
}

export function formatearFechaEspanol(date: Date): string {
  const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const str = date.toLocaleDateString('es-ES', opciones);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatearIntervaloSemana(inicio: Date): string {
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);

  const opcionesMes: Intl.DateTimeFormatOptions = { month: 'long' };
  const mesInicio = inicio.toLocaleDateString('es-ES', opcionesMes);
  const mesFin = fin.toLocaleDateString('es-ES', opcionesMes);

  if (inicio.getMonth() === fin.getMonth()) {
    return `${inicio.getDate()} - ${fin.getDate()} de ${mesFin}`;
  } else {
    return `${inicio.getDate()} de ${mesInicio} - ${fin.getDate()} de ${mesFin}`;
  }
}
