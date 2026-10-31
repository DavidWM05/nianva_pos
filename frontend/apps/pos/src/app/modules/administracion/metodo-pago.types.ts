export type TipoMetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'digital' | 'otro';

/** Espejo de MetodoPagoResource. */
export interface MetodoPagoAdmin {
  id: number;
  nombre: string;
  tipo: TipoMetodoPago;
  incluir_en_financiero: boolean;
  activo: boolean;
  /** true = fila del catalogo global sembrado (Efectivo/Tarjeta/Transferencia) -- nunca editable por un usuario normal. */
  es_global: boolean;
}

export interface MetodosPagoPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface MetodosPagoPagina {
  data: MetodoPagoAdmin[];
  total: number;
  permisos: MetodosPagoPermisos;
}
