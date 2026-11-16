import type { CuerpoDe, PlanPagoResource, RespuestaDe } from '@nianva/api-contrato';

/** PlanPagoResource (backend/app/Modules/VentasPlazos/Http/Resources/PlanPagoResource.php), del contrato (ARQ-12b). */
export type PlanPago = PlanPagoResource;

export type Periodicidad = PlanPagoResource['periodicidad'];

export type PlanPagoCliente = NonNullable<PlanPagoResource['cliente']>;

/** Solo viaja en show() -- ver PlanPagoController::show(). */
export type PlanPagoCuota = NonNullable<PlanPagoResource['cuotas']>[number];

export type EstadoCuotaPlanPago = PlanPagoCuota['estado'];

export type PlanPagoCrearPayload = CuerpoDe<'/ventas/{venta}/plan-pago', 'post'>;

export type PagarCuotaPayload = CuerpoDe<'/planes-pago-cliente/{plan}/pagar-cuota', 'post'>;

/** Lo que responde crear un plan: PlanPagoResource, como lo publica el contrato (ver el reporte de ARQ-12b). */
export type PlanPagoCreado = RespuestaDe<'/ventas/{venta}/plan-pago', 'post'>['data'];
