export type EstadoNotaCredito = 'activa' | 'usada_parcial' | 'usada_total' | 'expirada' | 'cancelada';

export interface NotaCreditoClienteResumen {
  id: number;
  nombre: string;
}

export interface NotaCreditoUsoVenta {
  id: number;
  fecha: string;
  total: string;
}

export interface NotaCreditoUso {
  id: number;
  venta_id: number;
  monto_usado: string;
  created_at: string;
  venta?: NotaCreditoUsoVenta | null;
}

export interface NotaCredito {
  id: number;
  cliente: NotaCreditoClienteResumen | null;
  devolucion_id: number;
  monto_original: string;
  saldo_disponible: string;
  fecha_expiracion: string | null;
  estado: EstadoNotaCredito;
  usos?: NotaCreditoUso[];
  created_at: string;
}
