import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { Observable, of, throwError } from 'rxjs';

import { AuthStateService } from '../../auth/auth-state.service';
import { AuthService } from '../../auth/auth.service';
import { BloqueoSesionService } from '../../auth/bloqueo-sesion.service';
import { TemaService } from '../../core/tema.service';
import { MenuUsuarioComponent } from './menu-usuario.component';

// SEG-12: el cajero bloquea la terminal desde su menu. Sin PIN de caja no se puede bloquear: se le
// dice donde configurarlo.

describe('MenuUsuarioComponent: bloquear sesion', () => {
  let fixture: ComponentFixture<MenuUsuarioComponent>;
  let bloquearSesion: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    bloquearSesion = vi.fn((): Observable<void> => of(undefined));
    toastError = vi.fn();
    TestBed.configureTestingModule({
      imports: [MenuUsuarioComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: TemaService, useValue: { preferenciaActual: signal('claro'), establecer: vi.fn() } },
        { provide: AuthService, useValue: { logout: vi.fn(), bloquearSesion } },
        { provide: AuthStateService, useValue: { usuario: signal({ nombre: 'Vendedor', apellido: null }), clear: vi.fn() } },
        { provide: ToastService, useValue: { error: toastError } },
      ],
    });
    fixture = TestBed.createComponent(MenuUsuarioComponent);
    fixture.detectChanges();
  });

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((contenedor) => (contenedor.innerHTML = '')));

  async function elegirBloquear(): Promise<void> {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const opcion = [...document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="menuitem"]')].find(
      (elemento) => elemento.textContent?.trim() === 'Bloquear sesión',
    );
    opcion!.click();
    fixture.detectChanges();
  }

  it('"Bloquear sesión" bloquea en el servidor y muestra la pantalla de bloqueo', async () => {
    await elegirBloquear();

    expect(bloquearSesion).toHaveBeenCalledOnce();
    expect(TestBed.inject(BloqueoSesionService).activa()).toBe(true);
  });

  it('sin PIN configurado avisa donde configurarlo y no bloquea', async () => {
    bloquearSesion.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409, error: { error_code: 'pin_caja_no_configurado', message: 'x' } })),
    );

    await elegirBloquear();

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Preferencias'), expect.anything());
    expect(TestBed.inject(BloqueoSesionService).activa()).toBe(false);
  });
});
