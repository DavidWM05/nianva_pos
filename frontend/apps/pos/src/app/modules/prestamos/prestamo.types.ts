export type EstadoPrestamo = 'activo' | 'pagado' | 'cancelado';

export interface PrestamoPago {
  id: number;
  monto: string;
  notas: string | null;
  fecha: string;
}

export interface Prestamo {
  id: number;
  proveedor_id: number | null;
  referencia: string | null;
  monto: string;
  interes: string;
  monto_a_pagar: string;
  saldo_pendiente: string;
  fecha_prestamo: string;
  fecha_vencimiento: string | null;
  estado: EstadoPrestamo;
  notas: string | null;
  pagos?: PrestamoPago[];
}

export interface PrestamoCrearPayload {
  referencia?: string | null;
  monto: number;
  interes?: number;
  fecha_prestamo: string;
  fecha_vencimiento?: string | null;
  notas?: string | null;
}

export interface RegistrarPagoPrestamoPayload {
  monto: number;
  notas?: string | null;
}
