import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthStateService } from './auth-state.service';
import { authGuard, requiereSesionGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard / requiereSesionGuard', () => {
  let authState: AuthStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStateService, { provide: AuthService, useValue: {} }, provideRouter([])],
    });

    authState = TestBed.inject(AuthStateService);
    router = TestBed.inject(Router);
  });

  it('authGuard redirige a /login si no hay sesion', () => {
    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(router.serializeUrl(resultado as never)).toBe('/login');
  });

  it('authGuard redirige a /two-factor/setup si el 2FA obligatorio no esta confirmado', () => {
    authState.setUsuario(usuarioDePrueba({ requiere_dos_factor: true, dos_factor_confirmado: false }));

    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(router.serializeUrl(resultado as never)).toBe('/two-factor/setup');
  });

  it('authGuard permite el paso con sesion y 2FA en regla', () => {
    authState.setUsuario(usuarioDePrueba({ requiere_dos_factor: true, dos_factor_confirmado: true }));

    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(resultado).toBe(true);
  });

  it('authGuard permite el paso con sesion cuando el 2FA no es obligatorio para el rol', () => {
    authState.setUsuario(usuarioDePrueba({ requiere_dos_factor: false, dos_factor_confirmado: false }));

    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(resultado).toBe(true);
  });

  it('requiereSesionGuard permite el paso con sesion aunque el 2FA no este confirmado', () => {
    authState.setUsuario(usuarioDePrueba({ requiere_dos_factor: true, dos_factor_confirmado: false }));

    const resultado = TestBed.runInInjectionContext(() => requiereSesionGuard({} as never, {} as never));

    expect(resultado).toBe(true);
  });

  it('requiereSesionGuard redirige a /login sin sesion', () => {
    const resultado = TestBed.runInInjectionContext(() => requiereSesionGuard({} as never, {} as never));

    expect(router.serializeUrl(resultado as never)).toBe('/login');
  });
});

function usuarioDePrueba(overrides: Partial<{ requiere_dos_factor: boolean; dos_factor_confirmado: boolean }>) {
  return {
    id: 1,
    nombre: 'Ana',
    apellido: null,
    correo: 'ana@test.com',
    tenant_id: 1,
    sucursal_id: 1,
    es_superadmin: false,
    roles: [],
    requiere_dos_factor: false,
    dos_factor_confirmado: false,
    ...overrides,
  };
}
