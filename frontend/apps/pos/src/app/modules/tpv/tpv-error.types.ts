import type { CodigoError } from '@nianva/ui-shared';

/**
 * Codigos de negocio que puede devolver el pipeline de venta. El catalogo
 * completo vive en @nianva/ui-shared y lo genera el backend.
 */
export type CodigoErrorTpv = CodigoError;

export interface ErrorNegocioTpv {
  message: string;
  error_code: CodigoError;
  [clave: string]: unknown;
}
