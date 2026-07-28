/** Espejo de CotizacionResource/CotizacionDetalleResource del backend (backend/app/Modules/Cotizaciones). */
export type EstadoCotizacion = 'pendiente' | 'convertida' | 'vencida' | 'anulada';

export interface CotizacionClienteResumen {
  id: number;
  nombre: string;
}

export interface CotizacionUsuarioResumen {
  id: number;
  nombre: string;
}

/** Solo `id`/`nombre` (nombre del producto) -- CotizacionDetalleResource no expone talla/color a diferencia de VentaDetalle/ApartadoDetalle. */
export interface CotizacionDetalleVariante {
  id: number;
  nombre: string | null;
}

export interface CotizacionDetalle {
  id: number;
  variante_id: number;
  variante: CotizacionDetalleVariante | null;
  cantidad: number;
  precio_unitario: string;
  descuento: string;
  subtotal: string;
}

export interface Cotizacion {
  id: number;
  numero_cotizacion: string;
  cliente: CotizacionClienteResumen | null;
  /** Solo viaja en show() -- index() no hace ->with('usuario'). */
  usuario?: CotizacionUsuarioResumen;
  total: string;
  descuento: string;
  estado: EstadoCotizacion;
  validez_dias: number;
  fecha_vencimiento: string | null;
  observaciones: string | null;
  uso_cfdi: string | null;
  venta_id: number | null;
  /** Solo viaja en show()/store()/update() -- index() no lo carga. */
  detalles?: CotizacionDetalle[];
  created_at: string;
  updated_at: string;
}

export interface CotizacionItemPayload {
  variante_id: number;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
}

export interface CotizacionFormPayload {
  cliente_id: number | null;
  validez_dias?: number;
  descuento?: number;
  uso_cfdi?: string | null;
  observaciones?: string | null;
  items: CotizacionItemPayload[];
}

/**
 * store() (a diferencia de update()) exige `sucursal_id` explicito en el
 * body -- ver el reporte de validacion de backend: es un hueco real (el
 * resto de Nucleo lo resuelve del usuario autenticado, nunca del cliente),
 * pero mientras no se cierre, hay que mandarlo. Nunca se expone en el
 * formulario -- CotizacionFormComponent lo llena con
 * AuthStateService.usuario()?.sucursal_id, no un input editable.
 */
export interface CotizacionCrearPayload extends CotizacionFormPayload {
  sucursal_id: number;
}
