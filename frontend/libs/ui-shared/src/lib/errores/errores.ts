import { HttpErrorResponse } from '@angular/common/http';

import { CODIGOS_ERROR, type CodigoError } from './codigos-error';

export interface ErrorNegocio {
  codigo: CodigoError;
  mensaje: string;
  contexto: Record<string, unknown>;
}

export const MENSAJE_SUCURSAL_REQUERIDA =
  'Tu usuario no tiene sucursal asignada; pide a un administrador que te asigne una.';

const CODIGOS = new Set<string>(CODIGOS_ERROR);

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function cuerpoDe(error: unknown): Record<string, unknown> | null {
  if (error instanceof HttpErrorResponse) {
    return esObjeto(error['error']) ? error['error'] : null;
  }

  if (!esObjeto(error)) {
    return null;
  }

  if ('error' in error) {
    return esObjeto(error['error']) ? error['error'] : null;
  }

  return error;
}

/**
 * Lee el sobre de error de API-03 y devuelve null cuando el codigo no es de
 * negocio: validacion nativa de Laravel (`errors`), 500 o codigo no catalogado.
 */
export function leerErrorNegocio(error: unknown): ErrorNegocio | null {
  const cuerpo = cuerpoDe(error);
  const codigo = cuerpo?.['error_code'];

  if (typeof codigo !== 'string' || !CODIGOS.has(codigo)) {
    return null;
  }

  const contexto = { ...cuerpo };
  delete contexto['message'];
  delete contexto['error_code'];

  return {
    codigo: codigo as CodigoError,
    mensaje: typeof cuerpo?.['message'] === 'string' ? cuerpo['message'] : '',
    contexto,
  };
}

/** Mantiene el texto del backend tanto en errores de negocio como de validacion. */
export function mensajeError(error: unknown, fallback: string): string {
  const cuerpo = cuerpoDe(error);

  return typeof cuerpo?.['message'] === 'string' ? cuerpo['message'] : fallback;
}

export function esErrorNegocio(error: unknown, codigo: CodigoError): boolean {
  return leerErrorNegocio(error)?.codigo === codigo;
}
