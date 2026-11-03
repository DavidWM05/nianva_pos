import type { AccionFila } from '@nianva/ui-actions';
import type { EntidadConEstado } from '@nianva/ui-feedback';

export interface MetaListado {
  total: number;
  page: number;
  rows: number;
  filtros_aplicados: Record<string, unknown>;
  permisos: Record<string, boolean>;
}

/** Respuesta completa de un listado de API-06: `XResource::collection()->additional(['meta' => …])`. */
export interface RespuestaListado<T> {
  data: T[];
  meta: MetaListado;
}

export interface CambioListado {
  page: number;
  rows: number;
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
}

export type FiltrosListado = Record<string, string | number | boolean | null | undefined>;

/** Query del backend API-06, sin valores vacios ni null. */
export function parametrosListado(
  cambio: CambioListado,
  filtros: FiltrosListado = {},
): Record<string, string | number> {
  const parametros: Record<string, string | number> = {
    page: Math.max(1, cambio.page),
    rows: Math.max(1, Math.min(100, cambio.rows)),
  };

  const sortField = cambio.sortField?.trim() ?? '';

  if (sortField !== '' && cambio.sortOrder !== null) {
    parametros['sort_field'] = sortField;
    parametros['sort_order'] = cambio.sortOrder;
  }

  for (const [campo, valor] of Object.entries(filtros)) {
    if (valor === null || valor === undefined) {
      continue;
    }

    const texto = typeof valor === 'string' ? valor.trim() : valor;

    if (texto === '') {
      continue;
    }

    parametros[campo] = typeof texto === 'boolean' ? String(texto) : texto;
  }

  return parametros;
}

export interface ColumnaBase<T> {
  campo: keyof T;
  encabezado: string;
  ordenable?: boolean;
}

export type ColumnaTexto<T> = ColumnaBase<T> & { tipo: 'texto' };
export type ColumnaPrincipal<T> = ColumnaBase<T> & { tipo: 'principal'; apoyo?: keyof T };
export type ColumnaDinero<T> = ColumnaBase<T> & { tipo: 'dinero' };
export type ColumnaCantidad<T> = ColumnaBase<T> & { tipo: 'cantidad'; unidad?: keyof T | string };
export type ColumnaPorcentaje<T> = ColumnaBase<T> & { tipo: 'porcentaje' };
export type ColumnaFecha<T> = ColumnaBase<T> & { tipo: 'fecha' };
export type ColumnaFechaHora<T> = ColumnaBase<T> & { tipo: 'fechaHora' };
export type ColumnaEstado<T> = ColumnaBase<T> & { tipo: 'estado'; entidad: EntidadConEstado };
export type ColumnaAcciones<T> = {
  tipo: 'acciones';
  /** Por fila: el estado (activar/desactivar) y los motivos de deshabilitado dependen de cada una. */
  acciones: (fila: T) => readonly AccionFila[];
  campo?: keyof T;
  encabezado?: string;
  ordenable?: boolean;
};

export type ColumnaListado<T> =
  | ColumnaTexto<T>
  | ColumnaPrincipal<T>
  | ColumnaDinero<T>
  | ColumnaCantidad<T>
  | ColumnaPorcentaje<T>
  | ColumnaFecha<T>
  | ColumnaFechaHora<T>
  | ColumnaEstado<T>
  | ColumnaAcciones<T>;
