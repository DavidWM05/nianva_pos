import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { UsuarioAdminService, UsuarioAltaPayload, UsuarioEdicionPayload, esAltaUsuario } from '@nianva/domain-administracion';

// API-08b: el alta y la edicion de usuario tienen cuerpos distintos. El alta exige password y
// roles (CuerpoDe<'/usuarios', 'post'>); la edicion es parcial y no exige password.
describe('Cuerpos de alta y edicion de usuario', () => {
  it('esAltaUsuario: un payload con password y roles es alta', () => {
    expect(esAltaUsuario({ nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123', roles: [3] })).toBe(true);
  });

  it('esAltaUsuario: una edicion sin password (o con password en blanco) no es alta', () => {
    expect(esAltaUsuario({ nombre: 'Ana', correo: 'ana@test.com', roles: [3] })).toBe(false);
    expect(esAltaUsuario({ nombre: 'Ana', correo: 'ana@test.com', password: '', roles: [3] })).toBe(false);
    expect(esAltaUsuario({ nombre: 'Ana', correo: 'ana@test.com', password: null })).toBe(false);
  });

  it('esAltaUsuario: sin roles no es alta', () => {
    expect(esAltaUsuario({ nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123' })).toBe(false);
  });

  it('el tipo de alta exige password; el de edicion no', () => {
    // @ts-expect-error el alta sin password no cumple CuerpoDe<'/usuarios', 'post'>
    const altaSinPassword: UsuarioAltaPayload = { nombre: 'Ana', correo: 'ana@test.com', roles: [3] };
    const edicionSinPassword: UsuarioEdicionPayload = { nombre: 'Ana', correo: 'ana@test.com' };

    expect(altaSinPassword).toBeDefined();
    expect(edicionSinPassword).toBeDefined();
  });

  it('el servicio manda el alta tal cual a POST /usuarios y la edicion a PUT /usuarios/{id}', () => {
    const http = {
      post: vi.fn().mockReturnValue(of({ data: { id: 6 } })),
      put: vi.fn().mockReturnValue(of({ data: { id: 6 } })),
    };
    TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
    const servicio = TestBed.inject(UsuarioAdminService);
    const alta: UsuarioAltaPayload = { nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123', roles: [3] };
    const edicion: UsuarioEdicionPayload = { nombre: 'Ana', correo: 'ana@test.com', password: '' };

    servicio.crear(alta).subscribe();
    servicio.actualizar(6, edicion).subscribe();

    expect(http.post).toHaveBeenCalledWith(expect.stringMatching(/\/usuarios$/), alta);
    expect(http.put).toHaveBeenCalledWith(expect.stringMatching(/\/usuarios\/6$/), edicion);
  });
});
