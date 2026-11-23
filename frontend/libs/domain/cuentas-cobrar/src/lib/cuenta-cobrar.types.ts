import type { AbonoCuentaResource, CuentaCobrarResource, CuerpoDe, RespuestaDe } from '@nianva/api-contrato';

/** Tipos de cuentas por cobrar tal como los publica el contrato (ARQ-12b). */
export type CuentaCobrar = CuentaCobrarResource;

export type EstadoCuentaCobrar = CuentaCobrarResource['estado'];

export type CuentaCobrarClienteResumen = NonNullable<CuentaCobrarResource['cliente']>;

export type AbonoCuenta = AbonoCuentaResource;

export type RegistrarAbonoPayload = CuerpoDe<'/cuentas-cobrar/{cuentaCobrar}/abonos', 'post'>;

/** CuentaCobrarController::reporte() -- solo cuentas con estado='pendiente', siempre "hoy". */
export type ReporteCuentasCobrar = Pick<RespuestaDe<'/cuentas-cobrar/reporte', 'get'>['data'],
  'total_pendiente' | 'total_vencido' | 'por_antiguedad' | 'por_cliente'
>;

export type ReporteAntiguedad = ReporteCuentasCobrar['por_antiguedad'];

export type ReporteCuentasCobrarCliente = ReporteCuentasCobrar['por_cliente'][number];
