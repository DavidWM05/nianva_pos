import type { MetodoPagoResource, RespuestaDe } from '@nianva/api-contrato';

/**
 * Método de pago tal como lo publica el contrato (MetodoPagoResource, ARQ-12b).
 * `es_global`: true = fila del catalogo global sembrado (Efectivo/Tarjeta/Transferencia) --
 * nunca editable por un usuario normal.
 */
export type MetodoPagoAdmin = MetodoPagoResource;

export type TipoMetodoPago = MetodoPagoResource['tipo'];

export type MetodosPagoPermisos = RespuestaDe<'/metodos-pago/{metodoPago}', 'get'>['meta']['permisos'];

export interface MetodosPagoPagina {
  data: MetodoPagoAdmin[];
  total: number;
  permisos: MetodosPagoPermisos;
}
