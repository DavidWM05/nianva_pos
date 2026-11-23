import type { CuerpoDe, TerminalResource } from '@nianva/api-contrato';

export type Terminal = TerminalResource;
export type TerminalPayload = CuerpoDe<'/terminales', 'post'>;
