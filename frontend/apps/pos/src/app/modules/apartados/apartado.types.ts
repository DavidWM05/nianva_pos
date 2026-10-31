/** Espejo de ApartadoResource del backend (backend/app/Modules/Apartados). */
export type EstadoApartado = 'activo' | 'completado' | 'cancelado';

export interface ApartadoClienteResumen {
  id: number;
  nombre: string;
}

export interface ApartadoDetalleVariante {
  id: number;
  talla: string | null;
  color: string | null;
  producto_nombre: string | null;
}

export interface ApartadoDetalle {
  id: number;
  variante_id: number;
  variante: ApartadoDetalleVariante | null;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
}

export interface ApartadoAbonoPagoResumen {
  metodo_pago_id: number;
  nombre: string | null;
  monto: string;
}

export interface ApartadoAbono {
  id: number;
  monto: string;
  fecha: string;
  notas: string | null;
  pagos: ApartadoAbonoPagoResumen[];
}

export interface Apartado {
  id: number;
  fecha_creacion: string;
  cliente: ApartadoClienteResumen | null;
  total: string;
  total_abonado: string;
  estado: EstadoApartado;
  fecha_vencimiento: string | null;
  fecha_completado: string | null;
  fecha_cancelado: string | null;
  motivo_cancelacion: string | null;
  venta_id: number | null;
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
  cliente_id: number;
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
  montoAbonadoPendiente: number;
}
