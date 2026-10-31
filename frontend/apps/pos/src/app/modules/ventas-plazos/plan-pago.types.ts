export type EstadoCuotaPlanPago = 'pendiente' | 'pagada' | 'vencida';
export type Periodicidad = 'semanal' | 'quincenal' | 'mensual';

export interface PlanPagoCliente {
  id: number;
  nombre: string;
}

export interface PlanPagoCuota {
  id: number;
  numero_cuota: number;
  monto: string;
  monto_capital: string;
  monto_interes: string;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: EstadoCuotaPlanPago;
}

/** PlanPagoResource (backend/app/Modules/Crm/Http/Resources/PlanPagoResource.php). */
export interface PlanPago {
  id: number;
  cliente?: PlanPagoCliente;
  venta_id: number | null;
  concepto: string;
  monto_total: string;
  interes_total: string;
  tasa_interes: string | null;
  numero_cuotas: number;
  periodicidad: Periodicidad;
  fecha_inicio: string;
  /** Solo viaja en show() -- ver PlanPagoController::show(). */
  cuotas?: PlanPagoCuota[];
  created_at: string;
}

export interface PlanPagoCrearPayload {
  numero_cuotas: number;
  tasa_interes?: number | null;
  periodicidad?: Periodicidad;
  fecha_inicio?: string | null;
}

export interface PagarCuotaPayload {
  cuota_id: number;
  monto?: number;
}
