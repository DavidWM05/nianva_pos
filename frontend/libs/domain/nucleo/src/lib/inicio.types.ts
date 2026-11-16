import type { RespuestaDe } from '@nianva/api-contrato';

/** Resumen de la pantalla de inicio, tal como lo publica el contrato (ARQ-12b). */
export type InicioResumen = RespuestaDe<'/inicio/resumen', 'get'>['data'];

export type VentasHoyResumen = InicioResumen['ventas_hoy'];

export type ApartadoPorVencer = InicioResumen['apartados_por_vencer'][number];
