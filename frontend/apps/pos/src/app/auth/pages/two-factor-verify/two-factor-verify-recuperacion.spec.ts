import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';
import { TwoFactorVerifyComponent } from './two-factor-verify.component';

// Quien perdio su app de autenticacion entra con un codigo de recuperacion en el mismo campo
// `code` de /login/2fa-verify. El backend lo compara en mayusculas y lo borra al usarlo.
const CODIGO = 'ABCDE12345-FGHIJ67890';
const RECHAZO = () => throwError(() => new HttpErrorResponse({ status: 422, error: { errors: { code: ['Codigo invalido.'] } } }));

describe('TwoFactorVerifyComponent: codigo de recuperacion', () => {
  let fixture: ComponentFixture<TwoFactorVerifyComponent>;
  let verifyTwoFactor: ReturnType<typeof vi.fn<(code: string) => Observable<unknown>>>;

  beforeEach(async () => {
    verifyTwoFactor = vi.fn<(code: string) => Observable<unknown>>(() => of({ user: { id: 1 } }));

    await TestBed.configureTestingModule({
      imports: [TwoFactorVerifyComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: AuthService, useValue: { verifyTwoFactor } },
        { provide: AuthStateService, useValue: { setUsuario: vi.fn() } },
      ],
    }).compileComponents();

    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(TwoFactorVerifyComponent);
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const botonTexto = (texto: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((boton) => boton.textContent?.includes(texto));
  const campoRecuperacion = () => {
    const etiqueta = [...el().querySelectorAll('label')].find((label) => label.textContent?.trim() === 'Código de recuperación');
    return etiqueta ? el().querySelector<HTMLInputElement>(`[id="${etiqueta.htmlFor}"]`) : null;
  };
  const campoTotp = () => el().querySelector<HTMLInputElement>('ui-input-codigo input');
  const cambiar = async (texto: string) => {
    botonTexto(texto)?.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const usarRecuperacion = () => cambiar('Usar un código de recuperación');
  const escribirRecuperacion = (texto: string) => {
    const campo = campoRecuperacion();
    if (! campo) throw new Error('No hay campo de recuperacion');
    campo.value = texto;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };
  const enviarRecuperacion = () => {
    el().querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  };
  const textosQueDescriben = (campo: HTMLElement | null) =>
    (campo?.getAttribute('aria-describedby')?.split(' ') ?? []).map((id) => el().querySelector(`[id="${id}"]`)?.textContent?.trim());

  it('empieza con el codigo de 6 digitos y ofrece el enlace a la recuperacion', () => {
    expect(campoTotp()).not.toBeNull();
    expect(campoRecuperacion()).toBeNull();
    expect(botonTexto('¿No tienes acceso a tu app? Usar un código de recuperación')?.type).toBe('button');
  });

  it('en modo recuperacion: campo de texto con su etiqueta, sin autocompletar ni teclado numerico, y la ayuda', async () => {
    await usarRecuperacion();
    const campo = campoRecuperacion();

    expect(campoTotp()).toBeNull();
    expect(campo?.type).toBe('text');
    expect(campo?.getAttribute('autocomplete')).toBe('off');
    expect(campo?.hasAttribute('inputmode')).toBe(false);
    expect(el().textContent).toContain('Cada código sirve una sola vez');
    expect(document.activeElement).toBe(campo);
  });

  it('volver al codigo de 6 digitos enfoca su campo', async () => {
    await usarRecuperacion();
    await cambiar('Usar el código de 6 dígitos de mi app');

    expect(campoRecuperacion()).toBeNull();
    expect(document.activeElement).toBe(campoTotp());
  });

  it('quita los espacios y pasa a mayusculas antes de enviarlo en `code`', async () => {
    await usarRecuperacion();
    escribirRecuperacion(' abcde 12345-fghij67890 ');
    enviarRecuperacion();

    expect(verifyTwoFactor.mock.calls).toEqual([[CODIGO]]);
  });

  it('un formato que no es XXXXXXXXXX-XXXXXXXXXX se marca en el campo sin llamar al backend', async () => {
    await usarRecuperacion();

    for (const invalido of ['', 'ABCDE12345', 'ABCDE12345FGHIJ67890', 'ABCDE1234-FGHIJ67890', 'ABCDE12345-FGHIJ6789Ñ']) {
      escribirRecuperacion(invalido);
      enviarRecuperacion();

      expect(campoRecuperacion()?.getAttribute('aria-invalid')).toBe('true');
      expect(textosQueDescriben(campoRecuperacion())).toContain(
        'El código tiene 10 letras o números, un guion y otros 10 (XXXXXXXXXX-XXXXXXXXXX).',
      );
    }
    expect(verifyTwoFactor).not.toHaveBeenCalled();
  });

  it('el rechazo del backend se muestra en el campo de recuperacion y se quita al escribir', async () => {
    verifyTwoFactor.mockImplementation(RECHAZO);
    await usarRecuperacion();
    escribirRecuperacion(CODIGO);
    enviarRecuperacion();

    expect(campoRecuperacion()?.getAttribute('aria-invalid')).toBe('true');
    expect(textosQueDescriben(campoRecuperacion())).toContain('Código inválido.');

    escribirRecuperacion(`${CODIGO}X`);
    expect(el().textContent).not.toContain('Código inválido.');
  });

  it('al cambiar de modo se limpia el error anterior, en los dos sentidos', async () => {
    verifyTwoFactor.mockImplementation(RECHAZO);
    fixture.debugElement.query((nodo) => nodo.name === 'nucleo-two-factor-code-input').componentInstance.codeSubmit.emit('000000');
    fixture.detectChanges();
    expect(el().textContent).toContain('Código inválido.');

    await usarRecuperacion();
    expect(el().textContent).not.toContain('Código inválido.');
    escribirRecuperacion(CODIGO);
    enviarRecuperacion();
    expect(el().textContent).toContain('Código inválido.');

    await cambiar('Usar el código de 6 dígitos de mi app');
    expect(el().textContent).not.toContain('Código inválido.');
    await usarRecuperacion();
    expect(campoRecuperacion()?.value).toBe('');
    expect(el().textContent).not.toContain('Código inválido.');
  });

  it('un rechazo del codigo de 6 digitos no reaparece al ir a la recuperacion y volver', async () => {
    verifyTwoFactor.mockImplementation(RECHAZO);
    fixture.debugElement.query((nodo) => nodo.name === 'nucleo-two-factor-code-input').componentInstance.codeSubmit.emit('000000');
    fixture.detectChanges();
    expect(el().textContent).toContain('Código inválido.');

    await usarRecuperacion();
    await cambiar('Usar el código de 6 dígitos de mi app');

    expect(campoTotp()?.getAttribute('aria-invalid')).toBeNull();
    expect(el().textContent).not.toContain('Código inválido.');
  });

  it('el codigo de 6 digitos se sigue enviando tal cual en `code`', () => {
    fixture.debugElement.query((nodo) => nodo.name === 'nucleo-two-factor-code-input').componentInstance.codeSubmit.emit('123456');

    expect(verifyTwoFactor.mock.calls).toEqual([['123456']]);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/');
  });
});
