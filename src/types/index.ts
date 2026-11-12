import { CATEGORIAS_OFICIALES } from '../utils/categorias';

export type DayOfWeekStr = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface AppConfig {
  id: string;
  primerDiaSemana: DayOfWeekStr;
  personasHogar?: number;
}

export interface PlanificacionDia {
  fecha: string; // YYYY-MM-DD
  modoComida: 'UNICO' | 'DOS_PLATOS';
  primerPlato: string;
  segundoPlato: string;
  cena: string;
  comidaFuera?: boolean;
  cenaFuera?: boolean;
  actualizadoEn: string;
}

export interface PlatoCatalogo {
  id: string;
  nombre: string;
  predeterminado: boolean;
  favorito?: boolean;
  racionesBase?: number;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Ingrediente {
  id: string;
  platoId: string;
  nombre: string;
  cantidad: number | null;
  unidad: string;
  categoria: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ElementoCompra {
  id: string;
  nombre: string;
  cantidad: number | null;
  unidad: string;
  categoria: string;
  origenes: string[];
  comprado: boolean;
  manual: boolean;
  productoManualId?: string;
}

export interface ProductoCompradoRecord {
  id: string;
  inicioSemana: string;
  comprado: boolean;
  actualizadoEn: string;
}

export interface ProductoManual {
  id: string;
  inicioSemana: string;
  nombre: string;
  cantidad: number | null;
  unidad: string;
  categoria: string;
  comprado: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export const UNIDADES_INGREDIENTE = [
  "unidad", "g", "kg", "ml", "l", "cucharada", "cucharadita", "paquete", "lata", "bote", "al gusto"
];

export const UNIDADES_MANUAL = [
  "unidad", "g", "kg", "ml", "l", "paquete", "lata", "bote", "botella", "caja", "bolsa", "rollo", "al gusto", "sin unidad"
];

export const CATEGORIAS_INGREDIENTE = CATEGORIAS_OFICIALES;

export const CATEGORIAS_ORDEN = CATEGORIAS_OFICIALES;
