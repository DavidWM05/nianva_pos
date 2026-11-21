/** Espejo de ApartadoResource del backend (backend/app/Modules/Apartados). */
export type EstadoApartado = 'activo' | 'completado' | 'cancelado';

export interface ApartadoClienteResumen {
  /** DAT-08: ulid del cliente. */
  id: string;
  nombre: string;
}

export interface ApartadoDetalleVariante {
  id: number;
  /** ARQ-07: nombre armado por atributos ("M / Rojo"), o null. */
  nombre: string | null;
  producto_nombre: string | null;
}

export interface ApartadoDetalle {
  /** DAT-08: ulid de la línea. */
  id: string;
  variante_id: number;
  variante: ApartadoDetalleVariante | null;
  cantidad: string;
  precio_unitario: string;
  subtotal: string;
}

export interface ApartadoAbonoPagoResumen {
  metodo_pago_id: number;
  nombre: string | null;
  monto: string;
}

export interface ApartadoAbono {
  /** DAT-08: ulid del abono. */
  id: string;
  monto: string;
  fecha: string;
  notas: string | null;
  pagos: ApartadoAbonoPagoResumen[];
}

export interface Apartado {
  /** DAT-08: ulid; es el que va en la ruta /apartados/:id y en la API. */
  id: string;
  /** D-3, transitorio: número visible (= id interno); lo reemplaza el folio de DAT-07. */
  numero: number;
  fecha_creacion: string;
  cliente?: ApartadoClienteResumen | null;
  total: string;
  total_abonado: string;
  estado: EstadoApartado;
  fecha_vencimiento: string | null;
  fecha_completado: string | null;
  fecha_cancelado: string | null;
  motivo_cancelacion: string | null;
  /** DAT-08: ulid de la venta de la liquidación. */
  venta_id: string | null;
  notas: string | null;
  /** Solo viaja en show() -- index() no la carga (ver ApartadoController). */
  detalles?: ApartadoDetalle[];
  abonos?: ApartadoAbono[];
}

export interface ApartadosListaPermisos {
  crear: boolean;
}

export interface ApartadosPagina {
  data: Apartado[];
  total: number;
  permisos: ApartadosListaPermisos;
}

export interface ApartadoDetallePermisos {
  abonar: boolean;
  cancelar: boolean;
}

export interface ApartadoItemPayload {
  variante_id: number;
  cantidad: number;
}

export interface ApartadoFormPayload {
  /** DAT-08: ulid del cliente. */
  cliente_id: string;
  items: ApartadoItemPayload[];
  fecha_vencimiento?: string | null;
  notas?: string | null;
}

export interface AbonoPagoPayload {
  metodo_pago_id: number;
  monto: number;
}

export interface AbonoFormPayload {
  monto: number;
  pagos: AbonoPagoPayload[];
  notas?: string | null;
}

/** Espejo de ResultadoCancelacion (backend/app/Modules/Apartados/Support). */
export interface ResultadoCancelacion {
  apartado: Apartado;
  tieneAbonosPendientes: boolean;
  montoAbonadoPendiente: string;
}
