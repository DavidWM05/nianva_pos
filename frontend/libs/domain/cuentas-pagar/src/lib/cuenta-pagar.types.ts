import type { AbonoPagarResource, CuentaPagarResource, CuerpoDe, RespuestaDe } from '@nianva/api-contrato';

/** Tipos de cuentas por pagar tal como los publica el contrato (ARQ-12b). */
export type CuentaPagar = CuentaPagarResource;

export type EstadoCuentaPagar = CuentaPagarResource['estado'];

export type CuentaPagarProveedorResumen = NonNullable<CuentaPagarResource['proveedor']>;

export type AbonoPagar = AbonoPagarResource;

export type RegistrarPagoPayload = CuerpoDe<'/cuentas-pagar/{cuentaPagar}/pagos', 'post'>;

/** CuentaPagarController::reporte() -- solo cuentas con estado='pendiente', siempre "hoy". */
export type ReporteCuentasPagar = Pick<RespuestaDe<'/cuentas-pagar/reporte', 'get'>['data'],
  'total_pendiente' | 'total_vencido' | 'por_antiguedad' | 'por_proveedor'
>;

export type ReporteAntiguedad = ReporteCuentasPagar['por_antiguedad'];

export type ReporteCuentasPagarProveedor = ReporteCuentasPagar['por_proveedor'][number];
