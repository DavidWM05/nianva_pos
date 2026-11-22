import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom, throwError } from 'rxjs';

import { configurarBaseApi, urlApi } from '../core/api-config';
import { AuthStateService } from './auth-state.service';
import { authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { BloqueoSesionService } from './bloqueo-sesion.service';

// SEG-12: cualquier peticion que el servidor rechaza con 423 sesion_bloqueada muestra el bloqueo,
// tambien la de GET /sesion al recargar. Mientras esta bloqueada, el guard espera al desbloqueo
// en vez de mandar al login: la sesion sigue viva.

describe('bloqueo de sesion: interceptor y guard', () => {
  let bloqueo: BloqueoSesionService;

  beforeEach(() => {
    configurarBaseApi('http://x');
    TestBed.configureTestingModule({
      providers: [AuthStateService, { provide: AuthService, useValue: {} }, provideRouter([])],
    });
    bloqueo = TestBed.inject(BloqueoSesionService);
  });

  async function responder(url: string, status: number, codigo: string): Promise<HttpErrorResponse> {
    const next = vi.fn(() => throwError(() => new HttpErrorResponse({ status, error: { error_code: codigo, message: 'x' } })));

    return firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', url), next))).catch(
      (error: HttpErrorResponse) => error,
    ) as Promise<HttpErrorResponse>;
  }

  it('un 423 sesion_bloqueada activa el bloqueo y propaga el error, tambien en GET /sesion', async () => {
    const error = await responder(urlApi('/sesion'), 423, 'sesion_bloqueada');

    expect(error.status).toBe(423);
    expect(bloqueo.activa()).toBe(true);
  });

  it('otro 4xx no bloquea', async () => {
    await responder(urlApi('/ventas'), 409, 'conflicto');

    expect(bloqueo.activa()).toBe(false);
  });

  it('el guard espera al desbloqueo y entonces decide con la sesion recargada', async () => {
    bloqueo.activar();
    let decision: unknown = 'pendiente';
    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)) as Promise<boolean | UrlTree>;
    void resultado.then((valor) => (decision = valor));
    await Promise.resolve();
    expect(decision).toBe('pendiente');

    TestBed.inject(AuthStateService).setUsuario({
      id: 1, nombre: 'Ana', apellido: null, correo: 'ana@test.com', tenant_id: 1, sucursal_id: 1,
      es_superadmin: false, roles: [], requiere_dos_factor: false, dos_factor_confirmado: false,
    } as never);
    bloqueo.desactivar();

    await expect(resultado).resolves.toBe(true);
  });

  it('si al desbloquear no hay sesion, el guard manda al login', async () => {
    bloqueo.activar();
    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)) as Promise<UrlTree>;

    bloqueo.descartar();

    expect(TestBed.inject(Router).serializeUrl(await resultado)).toBe('/login');
  });
});
