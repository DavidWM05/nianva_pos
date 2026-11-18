import type { SesionResource } from '@nianva/api-contrato';

/**
 * SesionResource del backend (GET /api/v1/sesion, API-09), generado desde
 * docs/api/openapi.json (API-08). `terminal` llega con el PIN de caja (Fase 4) y
 * `perfil_giro` en la Fase 7; hoy los dos son null.
 */
export type Sesion = SesionResource;
