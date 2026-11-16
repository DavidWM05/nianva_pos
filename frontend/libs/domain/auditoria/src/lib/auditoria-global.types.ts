import type { RespuestaDe } from '@nianva/api-contrato';

export interface AuditoriaGlobalFiltros {
  tabla?: string;
  usuario_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}

/**
 * Entrada del navegador global tal como la publica el contrato (ARQ-12b). Tiene la forma que
 * pinta el visor de auditoria de ui-shared (`AuditLogEntry`).
 */
export type EntradaAuditoria = RespuestaDe<'/auditoria/global', 'get'>['data'][number];
