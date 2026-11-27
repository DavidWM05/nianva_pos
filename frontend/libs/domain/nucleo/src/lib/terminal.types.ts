import type { CuerpoDe, TerminalResource } from '@nianva/api-contrato';

export type Terminal = Omit<TerminalResource, 'activo'> & Partial<Pick<TerminalResource, 'activo'>>;
export type TerminalPayload = CuerpoDe<'/terminales', 'post'>;
