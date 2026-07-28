import { VentaItemPayload, VentaPagoPayload } from '../tpv/venta.types';

/** Espejo de DevolucionResource del backend (backend/app/Modules/Devoluciones). */
export type TipoDevolucion = 'devolucion' | 'cambio';
export type TipoItemDevolucion = 'devuelto' | 'nuevo';

export interface DevolucionVentaResumen {
  id: number;
  cliente_nombre: string | null;
}

export interface DevolucionItemVariante {
  id: number;
  talla: string | null;
  color: string | null;
  producto_nombre: string | null;
}

export interface DevolucionItem {
  id: number;
  tipo: TipoItemDevolucion;
  variante_id: number;
  variante: DevolucionItemVariante | null;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  va_a_merma: boolean;
}

export interface DevolucionPagoResumen {
  metodo_pago_id: number;
  nombre: string | null;
  monto: string;
}

export type TipoReembolso = 'efectivo' | 'nota_credito';

export interface Devolucion {
  id: number;
  fecha: string;
  tipo: TipoDevolucion;
  venta: DevolucionVentaResumen | null;
  venta_sombra_id: number | null;
  monto_devolucion: string;
  monto_cambio: string;
  /** Negativo = reembolso al cliente; positivo = cobro adicional. Ya viene calculado por el backend. */
  diferencia: string;
  motivo: string | null;
  /** Solo tiene sentido si diferencia < 0 (reembolso al cliente). */
  tipo_reembolso: TipoReembolso | null;
  nota_credito_id: number | null;
  /** Solo viaja en show()/store() -- index() no la carga (ver DevolucionResource). */
  items?: DevolucionItem[];
  pagos?: DevolucionPagoResumen[];
}

export interface DevolucionesPermisos {
  crear: boolean;
}

export interface DevolucionesPagina {
  data: Devolucion[];
  total: number;
  permisos: DevolucionesPermisos;
}

export interface DevolucionItemDevueltoPayload {
  variante_id: number;
  cantidad: number;
  va_a_merma: boolean;
}

export interface DevolucionFormPayload {
  venta_id: number;
  tipo: TipoDevolucion;
  items_devueltos: DevolucionItemDevueltoPayload[];
  items_nuevos?: VentaItemPayload[];
  pagos?: VentaPagoPayload[];
  motivo?: string | null;
  /** Solo tiene efecto si diferencia < 0 (reembolso al cliente) -- DevolucionController lo ignora si no. */
  tipo_reembolso?: TipoReembolso | null;
}

/**
 * DevolucionController::store() la manda como llave hermana de `data` (no
 * dentro del modelo) cuando tipo_reembolso='nota_credito' generó una nota
 * nueva -- trae monto_original, que no viaja en `Devolucion.nota_credito_id`
 * (solo el id). Para ver saldo_disponible/estado despues hay que ir a
 * NotaCreditoService.obtener(nota_credito_id).
 */
export interface DevolucionNotaCreditoInfo {
  id: number;
  monto_original: string;
}
