import type { RespuestaDe } from '@nianva/api-contrato';

/** Resumen de la pantalla de inicio, tal como lo publica el contrato (ARQ-12b). */
export type InicioResumen = Pick<RespuestaDe<'/inicio/resumen', 'get'>['data'],
  'ventas_hoy' | 'apartados_por_vencer'
>;

export type VentasHoyResumen = InicioResumen['ventas_hoy'];

export type ApartadoPorVencer = InicioResumen['apartados_por_vencer'][number];
