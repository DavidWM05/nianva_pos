import { describe, expectTypeOf, it } from 'vitest';

import type { GastoResource, SesionResource, UsuarioResource } from './openapi';
import type { CuerpoDe, RespuestaDe } from './respuestas';

// Estas aserciones las comprueba tsc (primer comando del target test); en vitest no hacen nada.
describe('RespuestaDe y CuerpoDe', () => {
  it('toma el cuerpo de la respuesta 200 con su envoltura data', () => {
    expectTypeOf<RespuestaDe<'/sesion', 'get'>>().toEqualTypeOf<{ data: SesionResource }>();
    expectTypeOf<RespuestaDe<'/user', 'get'>>().toEqualTypeOf<{ data: UsuarioResource }>();
    expectTypeOf<RespuestaDe<'/gastos', 'get'>>().toEqualTypeOf<{ data: GastoResource[] }>();
  });

  it('usa la 201 cuando la ruta crea', () => {
    expectTypeOf<RespuestaDe<'/gastos', 'post'>>().toEqualTypeOf<{ data: GastoResource }>();
  });

  it('toma el cuerpo de la peticion del FormRequest', () => {
    expectTypeOf<CuerpoDe<'/gastos', 'post'>>().toMatchObjectType<{ descripcion: string }>();
  });

  it('los roles del usuario son textos, no unknown', () => {
    expectTypeOf<UsuarioResource['roles']>().toEqualTypeOf<string[]>();
  });

  it('rechaza una ruta o un metodo que no existen en el contrato', () => {
    // @ts-expect-error la ruta no esta en el contrato
    expectTypeOf<RespuestaDe<'/no-existe', 'get'>>();
    // @ts-expect-error /sesion no acepta POST
    expectTypeOf<RespuestaDe<'/sesion', 'post'>>();
  });
});
