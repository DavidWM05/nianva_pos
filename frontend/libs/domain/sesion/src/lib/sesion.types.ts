import type { SesionResource } from '@nianva/api-contrato';

/**
 * SesionResource del backend (GET /api/v1/sesion, API-09), generado desde
 * docs/api/openapi.json (API-08). `terminal` refleja la selección de la sesión y
 * `perfil_giro` resume el perfil elegido por el tenant y vale null hasta que elige.
 */
export type Sesion = Omit<SesionResource, 'plan' | 'limites'> & Partial<Pick<SesionResource, 'plan' | 'limites'>>;
