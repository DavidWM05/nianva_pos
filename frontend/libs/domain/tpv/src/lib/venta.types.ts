import type { RespuestaDe, VentaResource } from '@nianva/api-contrato';

/** Espejo de VentaResource del backend (backend/app/Modules/Tpv). */
export type EstadoVenta = 'completada' | 'anulada';

export interface VentaClienteResumen {
  /** DAT-08: ulid del cliente. */
  id: string;
  nombre: string;
}

export interface VentaMetodoPagoResumen {
  metodo_pago_id: number;
  nombre: string | null;
  monto: string;
}

export interface VentaDetalleVariante {
  id: number;
  /** ARQ-07: nombre armado por atributos ("M / Rojo"), o null. */
  nombre: string | null;
  producto_nombre: string | null;
}

export interface VentaDetalle {
  presentacion_id?: number | null;
  presentacion_nombre?: string;
  factor?: string;
  /** DAT-08: ulid de la línea; la devolución lo manda en venta_detalle_id. */
  id: string;
  variante_id: number;
  variante: VentaDetalleVariante | null;
  cantidad: NonNullable<VentaResource['detalles']>[number]['cantidad'];
  precio_unitario: string;
  descuento_aplicado: string;
  subtotal: string;
}

export interface Venta {
  folio?: VentaResource['folio'];
  /** DAT-08: ulid; es el que va en la ruta /tpv/ventas/:id y en la API. */
  id: string;
  fecha: string;
  cliente?: VentaClienteResumen | null;
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
export type VentaCotizacionItem = RespuestaDe<'/ventas/cotizar', 'post'>['data']['items'][number];

export type VentaCotizacion = RespuestaDe<'/ventas/cotizar', 'post'>['data'];

export interface VentaItemPayload {
  presentacion_id?: number | null;
  variante_id: number;
  cantidad: number;
}

export interface VentaPagoPayload {
  metodo_pago_id: number;
  monto: number;
}

export interface ReporteVentasPorSucursal {
  sucursal_id: number;
  sucursal_nombre: string | null;
  total: string;
  numero_ventas: number;
}

export interface ReporteVentasPorMetodoPago {
  metodo_pago_id: number;
  metodo_pago_nombre: string | null;
  total: string;
}

export interface ReporteVentasProducto {
  variante_id: number;
  producto_nombre: string | null;
  nombre: string | null;
  cantidad_vendida: string;
  total_vendido: string;
}

/** VentaController::reporte() -- solo ventas estado='completada' y es_venta_sombra=false. */
export interface ReporteVentas {
  total_ventas: string;
  numero_ventas: number;
  ticket_promedio: string;
  por_sucursal: ReporteVentasPorSucursal[];
  por_metodo_pago: ReporteVentasPorMetodoPago[];
  top_productos: ReporteVentasProducto[];
}

export interface ReporteVentasFiltros {
  fechaDesde?: string | null;
  fechaHasta?: string | null;
  sucursalId?: number | null;
}

export interface VentaFormPayload {
  lista_precio_id?: number | null;
  /** DAT-08: ulid del cliente. */
  cliente_id: string;
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
  /** DAT-08: ulid de la nota de crédito. */
  nota_credito_id?: string | null;
}
