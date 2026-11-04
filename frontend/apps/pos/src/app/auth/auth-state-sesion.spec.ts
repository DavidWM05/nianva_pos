import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';
import { CargaSesionService } from './carga-sesion.service';
import { SesionActualService } from './sesion-actual.service';
import { Sesion } from './sesion.types';

const sesion: Sesion = {
  usuario: { id: 7, nombre: 'Ana', apellido: null, correo: 'ana@x.test', tenant_id: 1, sucursal_id: 2, es_superadmin: false, roles: ['vendedor'], requiere_dos_factor: false, dos_factor_confirmado: false },
  sucursal: { id: 2, nombre: 'Centro' },
  terminal: null,
  permisos: ['ventas.ver'],
  modulos_activos: [],
  regional: { locale: 'es-MX', moneda: '$', zona_horaria: 'America/Mexico_City' },
  perfil_giro: null,
};

describe('AuthStateService con GET /sesion (API-09)', () => {
  let obtenerSesion: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    obtenerSesion = vi.fn(() => of(sesion));
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { obtenerSesion } }],
    });
  });

  it('al iniciar carga la sesion y de ahi el usuario', async () => {
    const estado = TestBed.inject(AuthStateService);

    await estado.initialize();

    expect(obtenerSesion).toHaveBeenCalledOnce();
    expect(estado.usuario()?.id).toBe(7);
    expect(TestBed.inject(SesionActualService).sesion()).toEqual(sesion);
    expect(estado.cargando()).toBe(false);
  });

  it('un 401 al iniciar deja la app como invitado, sin sesion', async () => {
    obtenerSesion.mockReturnValueOnce(throwError(() => ({ status: 401 })));
    const estado = TestBed.inject(AuthStateService);

    await estado.initialize();

    expect(estado.usuario()).toBeNull();
    expect(TestBed.inject(SesionActualService).sesion()).toBeNull();
    expect(estado.cargando()).toBe(false);
  });

  it('tras el login (setUsuario), CargaSesionService pide la sesion una sola vez', () => {
    TestBed.inject(CargaSesionService).iniciar();
    const estado = TestBed.inject(AuthStateService);

    estado.setUsuario(sesion.usuario);
    TestBed.tick();
    TestBed.tick();

    expect(obtenerSesion).toHaveBeenCalledOnce();
    expect(TestBed.inject(SesionActualService).sesion()).toEqual(sesion);
  });

  it('setUsuario no sale a la red por si mismo', () => {
    TestBed.inject(AuthStateService).setUsuario(sesion.usuario);

    expect(obtenerSesion).not.toHaveBeenCalled();
  });

  it('clear y setUsuario(null) limpian tambien la sesion', () => {
    const estado = TestBed.inject(AuthStateService);
    const actual = TestBed.inject(SesionActualService);

    actual.establecer(sesion);
    estado.clear();
    expect(actual.sesion()).toBeNull();

    actual.establecer(sesion);
    estado.setUsuario(null);
    expect(actual.sesion()).toBeNull();
  });
});
