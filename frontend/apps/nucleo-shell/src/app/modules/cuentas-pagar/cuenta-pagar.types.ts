export type EstadoCuentaPagar = 'pendiente' | 'pagada' | 'anulada';

export interface CuentaPagarProveedorResumen {
  id: number;
  razon_social: string;
}

export interface AbonoPagar {
  id: number;
  monto: string;
  metodo_pago: string | null;
  referencia: string | null;
  fecha: string;
}

export interface CuentaPagar {
  id: number;
  compra_id: number;
  proveedor: CuentaPagarProveedorResumen | null;
  monto_total: string;
  saldo_pendiente: string;
  fecha_vencimiento: string | null;
  estado: EstadoCuentaPagar;
  abonos?: AbonoPagar[];
  created_at: string;
}

export interface RegistrarPagoPayload {
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

export interface ReporteCuentasPagarProveedor {
  proveedor_id: number;
  proveedor_nombre: string | null;
  saldo_pendiente: number;
  cuentas_pendientes: number;
}

/** CuentaPagarController::reporte() -- solo cuentas con estado='pendiente', siempre "hoy". */
export interface ReporteCuentasPagar {
  total_pendiente: number;
  total_vencido: number;
  por_antiguedad: ReporteAntiguedad;
  por_proveedor: ReporteCuentasPagarProveedor[];
}
