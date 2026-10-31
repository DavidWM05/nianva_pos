export type EstadoCuentaCobrar = 'pendiente' | 'pagada' | 'anulada';

export interface CuentaCobrarClienteResumen {
  id: number;
  nombre: string;
}

export interface AbonoCuenta {
  id: number;
  monto: string;
  metodo_pago: string | null;
  referencia: string | null;
  fecha: string;
}

export interface CuentaCobrar {
  id: number;
  venta_id: number;
  cliente: CuentaCobrarClienteResumen | null;
  monto_total: string;
  saldo_pendiente: string;
  fecha_vencimiento: string | null;
  estado: EstadoCuentaCobrar;
  dias_vencida: number;
  abonos?: AbonoCuenta[];
  created_at: string;
}

export interface RegistrarAbonoPayload {
  monto: number;
  metodo_pago_id: number;
  referencia?: string | null;
}

export interface ReporteAntiguedad {
  al_dia: number;
  vencido_1_30: number;
  vencido_31_60: number;
  vencido_61_90: number;
  vencido_90_mas: number;
}

export interface ReporteCuentasCobrarCliente {
  cliente_id: number;
  cliente_nombre: string | null;
  saldo_pendiente: number;
  cuentas_pendientes: number;
}

/** CuentaCobrarController::reporte() -- solo cuentas con estado='pendiente', siempre "hoy". */
export interface ReporteCuentasCobrar {
  total_pendiente: number;
  total_vencido: number;
  por_antiguedad: ReporteAntiguedad;
  por_cliente: ReporteCuentasCobrarCliente[];
}
