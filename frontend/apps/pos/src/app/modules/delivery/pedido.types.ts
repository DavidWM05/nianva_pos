export type EstadoPedido = 'pendiente' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';

/** PedidoService::TRANSICIONES (backend) -- solo para habilitar/ocultar botones; la validacion real siempre es del servidor. */
export const TRANSICIONES_PEDIDO: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente: ['preparando', 'cancelado'],
  preparando: ['en_camino', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

export interface PedidoClienteResumen {
  id: number;
  nombre: string;
}

export interface PedidoRepartidorResumen {
  id: number;
  nombre: string;
}

export interface PedidoItem {
  id: number;
  variante_id: number;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
}

export interface Pedido {
  id: number;
  numero_pedido: string;
  cliente: PedidoClienteResumen | null;
  repartidor: PedidoRepartidorResumen | null;
  direccion_entrega: string | null;
  costo_delivery: string;
  estado: EstadoPedido;
  tiempo_estimado: number | null;
  notas: string | null;
  fecha_entrega: string | null;
  /** Solo viaja en show() -- index() no la carga (ver PedidoResource). */
  items?: PedidoItem[];
  created_at: string;
}

export interface PedidoItemPayload {
  variante_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface PedidoCrearPayload {
  cliente_id: number;
  sucursal_id: number;
  direccion_entrega?: string | null;
  /**
   * PedidoController::store() la acepta y PedidoService::crear() la
   * persiste, pero PedidoResource nunca la devuelve -- se manda igual (no
   * se pierde en BD) pero no se puede mostrar en el detalle todavia.
   * Reportado a backend.
   */
  referencia?: string | null;
  costo_delivery?: number;
  tiempo_estimado?: number | null;
  notas?: string | null;
  items?: PedidoItemPayload[];
}
