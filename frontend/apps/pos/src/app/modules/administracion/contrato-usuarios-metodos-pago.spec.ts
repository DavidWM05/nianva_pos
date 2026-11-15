import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MetodoPagoAdminService } from './metodo-pago-admin.service';
import { MetodosPagoPermisos } from './metodo-pago.types';

// Huecos del contrato que quedaron de API-08b: el PUT de usuarios sale del OpenAPI con
// password y roles opcionales (sin redefinirlos a mano) y meta.permisos de metodos de pago
// se tipa desde el contrato, sin casts. Lo comprueba el compilador al construir el spec.
describe('Contrato de usuarios y metodos de pago', () => {
  it('el alta de usuario exige password; la edicion compila sin password ni roles', () => {
    // @ts-expect-error el alta sin password no cumple CuerpoDe<'/usuarios', 'post'>
    const altaSinPassword: CuerpoDe<'/usuarios', 'post'> = { nombre: 'Ana', correo: 'ana@test.com', roles: [3] };
    const edicionMinima: CuerpoDe<'/usuarios/{usuario}', 'put'> = { nombre: 'Ana', correo: 'ana@test.com' };
    const edicionSinCambiarPassword: CuerpoDe<'/usuarios/{usuario}', 'put'> = { nombre: 'Ana', correo: 'ana@test.com', password: null };

    expect(altaSinPassword).toBeDefined();
    expect(edicionMinima).toBeDefined();
    expect(edicionSinCambiarPassword).toBeDefined();
  });

  it('meta.permisos del detalle de metodo de pago es un objeto de booleanos en el contrato', () => {
    const permisos: RespuestaDe<'/metodos-pago/{metodoPago}', 'get'>['meta']['permisos'] = { crear: true, editar: false, eliminar: true };
    const tipados: MetodosPagoPermisos = permisos;

    expect(tipados).toEqual({ crear: true, editar: false, eliminar: true });
  });

  it('el servicio de metodos de pago devuelve los permisos del listado y del detalle tal cual', () => {
    const permisos = { crear: true, editar: false, eliminar: false };
    const http = {
      get: vi
        .fn()
        .mockReturnValueOnce(of({ data: [], meta: { total: 0, permisos } }))
        .mockReturnValueOnce(of({ data: { id: 1 }, meta: { permisos } })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
    const servicio = TestBed.inject(MetodoPagoAdminService);
    const recibidos: MetodosPagoPermisos[] = [];

    servicio.listar({ first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} }, '').subscribe((p) => recibidos.push(p.permisos));
    servicio.obtener(1).subscribe((r) => recibidos.push(r.permisos));

    expect(recibidos).toEqual([permisos, permisos]);
  });
});
