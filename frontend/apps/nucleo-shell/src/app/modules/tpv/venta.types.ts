/** Espejo de VentaResource del backend (backend/app/Modules/Tpv). */
export type EstadoVenta = 'completada' | 'anulada';

export interface VentaClienteResumen {
  id: number;
  nombre: string;
}

export interface VentaMetodoPagoResumen {
  metodo_pago_id: number;
  nombre: string | null;
  monto: string;
}

export interface VentaDetalleVariante {
  id: number;
  talla: string | null;
  color: string | null;
  producto_nombre: string | null;
}

export interface VentaDetalle {
  id: number;
  variante_id: number;
  variante: VentaDetalleVariante | null;
  cantidad: number;
  precio_unitario: string;
  descuento_aplicado: string;
  subtotal: string;
}

export interface Venta {
  id: number;
  fecha: string;
  cliente: VentaClienteResumen | null;
  total: string;
  descuento_cupon: string;
  descuento_manual: string;
  abono_previo: string;
  estado: EstadoVenta;
  motivo_anulacion: string | null;
  fecha_anulacion: string | null;
  es_venta_sombra: boolean;
  /** Solo viaja cuando el backend hace ->load('pagos.metodoPago') -- ver VentaResource::whenLoaded(). */
  metodos_pago?: VentaMetodoPagoResumen[];
  /** Solo viaja en show()/store()/anular() -- index() no la carga. */
  detalles?: VentaDetalle[];
}

export interface VentasPermisos {
  anular: boolean;
}

export interface VentasPagina {
  data: Venta[];
  total: number;
  permisos: VentasPermisos;
}

/** Espejo de VentaService::cotizarItems() (backend), expuesto via POST /api/ventas/cotizar. */
export interface VentaCotizacionItem {
  variante_id: number;
  regla_precio_id: number | null;
  cantidad: number;
  precio_unitario: number;
  descuento_aplicado: number;
  subtotal: number;
}

export interface VentaCotizacion {
  items: VentaCotizacionItem[];
  subtotal: number;
}

export interface VentaItemPayload {
  variante_id: number;
  cantidad: number;
}

export interface VentaPagoPayload {
  metodo_pago_id: number;
  monto: number;
}

export interface VentaFormPayload {
  cliente_id: number;
  items: VentaItemPayload[];
  pagos: VentaPagoPayload[];
  cupon_codigo?: string | null;
  descuento_manual?: number | null;
  /**
   * VentaController::store() no lee un monto para la gift card: aplica
   * min(saldo_actual, totalEstimado) automaticamente y descuenta esa
   * cantidad -- no hay forma de saber el saldo real desde el frontend (no
   * existe un endpoint de "consultar por codigo"), asi que el cajero solo
   * manda el codigo.
   */
  gift_card_codigo?: string | null;
  nota_credito_id?: number | null;
}
