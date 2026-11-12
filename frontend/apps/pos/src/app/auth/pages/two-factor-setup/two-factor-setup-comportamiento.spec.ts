import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../auth.service';
import { AuthStateService } from '../../auth-state.service';
import { TwoFactorConfirmResponse, TwoFactorSetupResponse } from '../../usuario.types';
import { GENERAR_QR, TwoFactorSetupComponent } from './two-factor-setup.component';

// 50j (PRO-01, paso 1): el comportamiento de la configuracion de 2FA sin mirar el DOM de la
// libreria. Pasa con PrimeNG y despues; reemplaza al caso del indicador de
// two-factor-setup.component.spec.ts, que buscaba el icono de carga de p-button.
describe('TwoFactorSetupComponent: comportamiento', () => {
  let setup$: Subject<TwoFactorSetupResponse>;
  let confirmar$: Subject<TwoFactorConfirmResponse>;
  let authService: { getTwoFactorSetup: ReturnType<typeof vi.fn>; confirmTwoFactor: ReturnType<typeof vi.fn> };
  let authState: { setUsuario: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    setup$ = new Subject();
    confirmar$ = new Subject();
    authService = {
      getTwoFactorSetup: vi.fn(() => setup$),
      confirmTwoFactor: vi.fn(() => confirmar$),
    };
    authState = { setUsuario: vi.fn() };

    TestBed.configureTestingModule({
      imports: [TwoFactorSetupComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: authService },
        { provide: AuthStateService, useValue: authState },
        { provide: GENERAR_QR, useValue: () => Promise.resolve('data:image/png;base64,QR') },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function conQr() {
    const fixture = TestBed.createComponent(TwoFactorSetupComponent);
    fixture.detectChanges();
    setup$.next({ secret: 'SECRETO', otpauth_url: 'otpauth://totp/x' } as TwoFactorSetupResponse);
    await vi.runAllTimersAsync();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const boton = (texto: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === texto);
    const enviar = () => {
      el.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();
    };

    return { fixture, el, boton, enviar };
  }

  it('muestra el secreto para escribirlo a mano y "Confirmar" espera los 6 digitos', async () => {
    const { fixture, el, boton } = await conQr();

    expect(el.textContent).toContain('SECRETO');
    expect(boton('Confirmar')?.disabled).toBe(true);

    fixture.componentInstance['code'].setValue('123456');
    fixture.detectChanges();
    expect(boton('Confirmar')?.disabled).toBe(false);
  });

  it('al confirmar envia el codigo; el boton queda deshabilitado y su indicador aparece pasado el umbral', async () => {
    const { fixture, boton, enviar } = await conQr();
    fixture.componentInstance['code'].setValue('123456');
    fixture.detectChanges();
    const marcasAntes = boton('Confirmar')?.querySelectorAll('[aria-hidden="true"]').length ?? 0;

    enviar();
    expect(authService.confirmTwoFactor).toHaveBeenCalledWith('123456');
    expect(boton('Confirmar')?.disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(299);
    fixture.detectChanges();
    expect(boton('Confirmar')?.querySelectorAll('[aria-hidden="true"]').length).toBe(marcasAntes);

    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(boton('Confirmar')?.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(marcasAntes);
  });

  it('si el codigo no vale, dice "Código inválido." y vacia el campo', async () => {
    const { fixture, el, boton, enviar } = await conQr();
    fixture.componentInstance['code'].setValue('123456');
    fixture.detectChanges();

    enviar();
    confirmar$.error({ status: 422 });
    fixture.detectChanges();

    expect(el.textContent).toContain('Código inválido.');
    expect(fixture.componentInstance['code'].value).toBe('');
    expect(boton('Confirmar')?.disabled).toBe(true);
  });

  it('al confirmar muestra los codigos de recuperacion y "continuar" lleva al inicio', async () => {
    const { fixture, el, boton, enviar } = await conQr();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance['code'].setValue('123456');
    fixture.detectChanges();

    enviar();
    confirmar$.next({ user: { id: 1 }, recovery_codes: ['AAAA-1111', 'BBBB-2222'] } as unknown as TwoFactorConfirmResponse);
    fixture.detectChanges();

    expect(authState.setUsuario).toHaveBeenCalledWith({ id: 1 });
    expect([...el.querySelectorAll('li')].map((li) => li.textContent?.trim())).toEqual(['AAAA-1111', 'BBBB-2222']);
    expect(el.querySelector('form')).toBeNull();

    boton('Ya los guardé, continuar')?.click();
    expect(navegar).toHaveBeenCalledWith('/');
  });
});
