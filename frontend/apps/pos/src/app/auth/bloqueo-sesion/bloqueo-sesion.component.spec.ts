import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthApiService } from '@nianva/domain-sesion';
import { ToastService } from '@nianva/ui-shared';
import { Observable, of, throwError } from 'rxjs';

import { AuthStateService } from '../auth-state.service';
import { AuthService } from '../auth.service';
import { BloqueoSesionService } from '../bloqueo-sesion.service';
import { SesionEntrePestanasService } from '../sesion-entre-pestanas.service';
import { BloqueoSesionComponent } from './bloqueo-sesion.component';

// SEG-12: con la sesion bloqueada, la pantalla pide el PIN de caja del mismo usuario. Nunca cambia
// de usuario: la salida es cerrar sesion. Al recargar bloqueado no hay sesion cargada; al
// desbloquear se carga antes de soltar el guard.

function rechazo(codigo: string, status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { error_code: codigo, message: 'x' } });
}

describe('BloqueoSesionComponent', () => {
  let fixture: ComponentFixture<BloqueoSesionComponent>;
  let bloqueo: BloqueoSesionService;
  let desbloquearSesion: ReturnType<typeof vi.fn>;
  let authState: { autenticado: ReturnType<typeof vi.fn>; initialize: ReturnType<typeof vi.fn> };
  let cerrarSesion: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    desbloquearSesion = vi.fn((): Observable<void> => of(undefined));
    authState = { autenticado: vi.fn(() => true), initialize: vi.fn(() => Promise.resolve()) };
    cerrarSesion = vi.fn();
    logout = vi.fn((): Observable<void> => of(undefined));
    toastError = vi.fn();
    TestBed.configureTestingModule({
      imports: [BloqueoSesionComponent],
      providers: [
        { provide: AuthApiService, useValue: { desbloquearSesion } },
        { provide: AuthStateService, useValue: authState },
        { provide: AuthService, useValue: { logout } },
        { provide: SesionEntrePestanasService, useValue: { cerrarSesion } },
        { provide: ToastService, useValue: { error: toastError } },
      ],
    });
    fixture = TestBed.createComponent(BloqueoSesionComponent);
    bloqueo = TestBed.inject(BloqueoSesionService);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => fixture.nativeElement.remove());

  const raiz = () => fixture.nativeElement as HTMLElement;
  const entrada = () => raiz().querySelector<HTMLInputElement>('.ui-input-pin__entrada');

  async function bloquear(): Promise<void> {
    bloqueo.activar();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function desbloquearCon(pin: string): Promise<void> {
    for (const digito of pin) {
      entrada()!.dispatchEvent(new KeyboardEvent('keydown', { key: digito, bubbles: true, cancelable: true }));
    }
    fixture.detectChanges();
    raiz().querySelector<HTMLFormElement>('form')!.requestSubmit();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('no muestra nada sin bloqueo; bloqueada, pide el PIN con el foco en el', async () => {
    expect(raiz().querySelector('[role="dialog"]')).toBeNull();

    await bloquear();

    expect(raiz().querySelector('[role="dialog"]')?.textContent).toContain('Sesión bloqueada');
    expect(document.activeElement).toBe(entrada());
  });

  it('con el PIN correcto desbloquea sin recargar la sesion si ya estaba cargada', async () => {
    await bloquear();

    await desbloquearCon('2468');

    expect(desbloquearSesion).toHaveBeenCalledWith('2468');
    expect(authState.initialize).not.toHaveBeenCalled();
    expect(bloqueo.activa()).toBe(false);
  });

  it('tras recargar bloqueado, carga la sesion antes de soltar el bloqueo', async () => {
    authState.autenticado.mockReturnValue(false);
    let activaAlCargar: boolean | undefined;
    authState.initialize.mockImplementation(() => {
      activaAlCargar = bloqueo.activa();
      return Promise.resolve();
    });
    await bloquear();

    await desbloquearCon('2468');

    expect(authState.initialize).toHaveBeenCalledOnce();
    expect(activaAlCargar).toBe(true);
    expect(bloqueo.activa()).toBe(false);
  });

  it('un PIN incorrecto avisa, limpia y sigue bloqueada', async () => {
    desbloquearSesion.mockReturnValueOnce(throwError(() => rechazo('pin_caja_incorrecto', 422)));
    await bloquear();

    await desbloquearCon('1357');

    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('El PIN no es correcto.');
    expect(entrada()?.value).toBe('');
    expect(bloqueo.activa()).toBe(true);
  });

  it('agotados los intentos, el servidor ya cerro la sesion: avisa y vuelve al login', async () => {
    desbloquearSesion.mockReturnValueOnce(throwError(() => rechazo('pin_caja_intentos_agotados', 429)));
    await bloquear();

    await desbloquearCon('1357');

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Se agotaron los intentos'), expect.anything());
    expect(cerrarSesion).toHaveBeenCalledOnce();
    expect(bloqueo.activa()).toBe(false);
  });

  it('Desbloquear no depende de que se refleje el ultimo digito: Enter justo despues del PIN envia', async () => {
    await bloquear();

    // Sin detectChanges entre el ultimo digito y el envio, como un Enter inmediato.
    for (const digito of '2468') {
      entrada()!.dispatchEvent(new KeyboardEvent('keydown', { key: digito, bubbles: true, cancelable: true }));
    }
    const boton = raiz().querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(boton.disabled).toBe(false);
  });

  it('con menos de 4 digitos no envia y pide el PIN completo', async () => {
    await bloquear();

    await desbloquearCon('24');

    expect(desbloquearSesion).not.toHaveBeenCalled();
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('de 4 a 6 dígitos');
  });

  it('"Cerrar sesión" sale sin pedir el PIN', async () => {
    await bloquear();

    [...raiz().querySelectorAll<HTMLButtonElement>('button')].find((boton) => boton.textContent?.trim() === 'Cerrar sesión')!.click();

    expect(logout).toHaveBeenCalledOnce();
    expect(bloqueo.activa()).toBe(false);
  });
});
