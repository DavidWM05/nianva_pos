import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { esErrorNegocio, leerErrorNegocio, mensajeError } from './errores';

function respuesta(error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status: 422, error });
}

describe('errores de negocio', () => {
  it('lee un error de negocio del catalogo y separa su contexto', () => {
    const error = respuesta({
      message: 'La caja 7 ya esta cerrada.',
      error_code: 'caja_ya_cerrada',
      caja_sesion_id: 7,
    });

    expect(leerErrorNegocio(error)).toEqual({
      codigo: 'caja_ya_cerrada',
      mensaje: 'La caja 7 ya esta cerrada.',
      contexto: { caja_sesion_id: 7 },
    });
    expect(esErrorNegocio(error, 'caja_ya_cerrada')).toBe(true);
    expect(esErrorNegocio(error, 'venta_ya_anulada')).toBe(false);
  });

  it('no confunde una validacion 422 de Laravel con un error de negocio', () => {
    const error = respuesta({
      message: 'The given data was invalid.',
      errors: { nombre: ['El nombre es obligatorio.'] },
    });

    expect(leerErrorNegocio(error)).toBeNull();
    expect(mensajeError(error, 'No se pudo guardar.')).toBe('The given data was invalid.');
  });

  it('usa el fallback cuando no hay cuerpo de error', () => {
    const error = new HttpErrorResponse({ status: 500 });

    expect(leerErrorNegocio(error)).toBeNull();
    expect(mensajeError(error, 'No se pudo guardar.')).toBe('No se pudo guardar.');
  });

  it('muestra el message aunque el error_code no este en el catalogo', () => {
    const error = respuesta({
      message: 'El backend agrego un codigo nuevo.',
      error_code: 'codigo_fuera_del_catalogo',
    });

    expect(leerErrorNegocio(error)).toBeNull();
    expect(mensajeError(error, 'No se pudo guardar.')).toBe('El backend agrego un codigo nuevo.');
  });
});
