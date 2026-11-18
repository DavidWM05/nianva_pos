import { describe, expect, expectTypeOf, it } from 'vitest';

import { limitesDe } from './limites-de';
import type { CuerpoDe } from './respuestas';

describe('limitesDe (UI-11b)', () => {
  it('devuelve los límites del cuerpo de la petición por campo', () => {
    const limites = limitesDe('/categorias', 'post');

    expect(limites.nombre).toEqual({ requerido: true, maxLength: 120 });
    expect(limites.descripcion).toEqual({ requerido: false });
  });

  it('trae minimum, maximum y decimales de un campo numérico', () => {
    expect(limitesDe('/reglas-precio', 'post').porcentaje).toEqual({
      requerido: false,
      minimum: 0,
      maximum: 100,
      decimales: 4,
    });
  });

  it('los campos son los mismos que los de CuerpoDe para la misma ruta y método', () => {
    expectTypeOf<keyof ReturnType<typeof limitesDe<'/categorias', 'post'>>>().toEqualTypeOf<
      keyof NonNullable<CuerpoDe<'/categorias', 'post'>>
    >();
  });

  it('las líneas de un documento traen los límites de cada campo en un segundo nivel', () => {
    const linea = limitesDe('/ventas', 'post').items.elemento;

    expect(linea.cantidad.decimales).toBe(3);
    expect(linea.variante_id.requerido).toBe(true);
    expectTypeOf<keyof typeof linea>().toEqualTypeOf<
      keyof NonNullable<CuerpoDe<'/ventas', 'post'>>['items'][number]
    >();
  });

  it('no compila con una ruta o un método que no existen', () => {
    // @ts-expect-error la ruta no existe en el contrato
    expect(() => limitesDe('/no-existe', 'post')).toThrow();
    // @ts-expect-error /categorias no tiene cuerpo en get
    expect(() => limitesDe('/categorias', 'get')).toThrow();
  });
});
