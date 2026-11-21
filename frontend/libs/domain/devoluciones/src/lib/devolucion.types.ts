import type { CuerpoDe } from '@nianva/api-contrato';

// Las lineas nuevas y los pagos de un cambio salen del contrato de POST /devoluciones, no de
// @nianva/domain-tpv: una lib de dominio solo depende de libs type:core (ARQ-12c).
type CuerpoDevolucion = CuerpoDe<'/devoluciones', 'post'>;
export type DevolucionItemNuevoPayload = NonNullable<CuerpoDevolucion['items_nuevos']>[number];
export type DevolucionPagoPayload = NonNullable<CuerpoDevolucion['pagos']>[number];

/** Espejo de DevolucionResource del backend (backend/app/Modules/Devoluciones). */
export type TipoDevolucion = 'devolucion' | 'cambio';
export type TipoItemDevolucion = 'devuelto' | 'nuevo';

export interface DevolucionVentaResumen {
  /** DAT-08: ulid de la venta origen. */
  id: string;
  /** D-3, transitorio: número visible de la venta; lo reemplaza el folio de DAT-07. */
  numero: number;
  cliente_nombre: string | null;
}

export interface DevolucionItemVariante {
  id: number;
  /** ARQ-07: nombre armado por atributos ("M / Rojo"), o null. */
  nombre: string | null;
  producto_nombre: string | null;
}

export interface DevolucionItem {
  /** DAT-08: ulid de la línea. */
  id: string;
  tipo: TipoItemDevolucion;
  variante_id: number;
  variante: DevolucionItemVariante | null;
  cantidad: string;
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
  /** DAT-08: ulid; es el que va en la ruta /devoluciones/:id y en la API. */
  id: string;
  /** D-3, transitorio: número visible (= id interno); lo reemplaza el folio de DAT-07. */
  numero: number;
  fecha: string;
  tipo: TipoDevolucion;
  venta?: DevolucionVentaResumen | null;
  venta_sombra_id: string | null;
  /** D-3, transitorio: número visible de la venta sombra; lo reemplaza el folio de DAT-07. */
  venta_sombra_numero: number | null;
  monto_devolucion: string;
  monto_cambio: string;
  /** Negativo = reembolso al cliente; positivo = cobro adicional. Ya viene calculado por el backend. */
  diferencia: string;
  motivo: string | null;
  /** Solo tiene sentido si diferencia < 0 (reembolso al cliente). */
  tipo_reembolso: TipoReembolso | null;
  nota_credito_id: string | null;
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
  /** DAT-08: ulid de la línea de la venta origen. */
  venta_detalle_id?: string;
  variante_id: number;
  cantidad: number;
  va_a_merma: boolean;
}

export interface DevolucionFormPayload {
  /** DAT-08: ulid de la venta origen. */
  venta_id: string;
  tipo: TipoDevolucion;
  items_devueltos: DevolucionItemDevueltoPayload[];
  items_nuevos?: DevolucionItemNuevoPayload[];
  pagos?: DevolucionPagoPayload[];
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
  /** DAT-08: ulid de la nota. */
  id: string;
  /** D-3, transitorio: número visible de la nota. */
  numero: number;
  monto_original: string;
}
