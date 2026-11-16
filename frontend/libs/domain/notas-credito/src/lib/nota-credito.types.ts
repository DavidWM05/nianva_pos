import type { NotaCreditoResource } from '@nianva/api-contrato';

/** Tipos de notas de credito tal como los publica el contrato (ARQ-12b). */
export type NotaCredito = NotaCreditoResource;

export type EstadoNotaCredito = NotaCreditoResource['estado'];

export type NotaCreditoClienteResumen = NonNullable<NotaCreditoResource['cliente']>;

/** Uso de la nota con la venta que carga show() (`usos.venta`). */
export type NotaCreditoUso = NonNullable<NotaCreditoResource['usos']>[number];
