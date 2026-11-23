import type { RespuestaDe } from '@nianva/api-contrato';

type InicioContrato = RespuestaDe<'/inicio/resumen', 'get'>['data'];

/** Resumen de la pantalla de inicio, tal como lo publica el contrato (ARQ-12b). */
export type InicioResumen = Pick<InicioContrato, 'ventas_hoy' | 'apartados_por_vencer'>;

export type VentasHoyResumen = InicioResumen['ventas_hoy'];

export type ApartadoPorVencer = InicioResumen['apartados_por_vencer'][number];

export interface VarianteRankingInicio {
  variante_id: number;
  producto_nombre: string | null;
  cantidad_base: string;
}

export interface RankingInicio {
  unidad: InicioContrato['ranking_variantes'][number]['unidad'];
  variantes: VarianteRankingInicio[];
}

export type InicioResumenMetricas = Omit<InicioContrato, 'ranking_variantes'> & {
  ranking_variantes: RankingInicio[];
};
