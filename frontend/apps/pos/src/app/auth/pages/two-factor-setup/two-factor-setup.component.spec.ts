import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../auth.service';
import { AuthStateService } from '../../auth-state.service';
import { TwoFactorConfirmResponse, TwoFactorSetupResponse } from '../../usuario.types';
import { GENERAR_QR, TwoFactorSetupComponent } from './two-factor-setup.component';

describe('TwoFactorSetupComponent', () => {
  let setup$: Subject<TwoFactorSetupResponse>;
  let confirmar$: Subject<TwoFactorConfirmResponse>;
  let authService: { getTwoFactorSetup: ReturnType<typeof vi.fn>; confirmTwoFactor: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    setup$ = new Subject();
    confirmar$ = new Subject();
    authService = {
      getTwoFactorSetup: vi.fn(() => setup$),
      confirmTwoFactor: vi.fn(() => confirmar$),
    };

    TestBed.configureTestingModule({
      imports: [TwoFactorSetupComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: AuthStateService, useValue: { setUsuario: vi.fn() } },
        { provide: GENERAR_QR, useValue: () => Promise.resolve('data:image/png;base64,QR') },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  async function crear() {
    const fixture = TestBed.createComponent(TwoFactorSetupComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  async function cargarQr(fixture: Awaited<ReturnType<typeof crear>>['fixture']) {
    setup$.next({ secret: 'SECRETO', otpauth_url: 'otpauth://totp/x' } as TwoFactorSetupResponse);
    await vi.runAllTimersAsync();
    fixture.detectChanges();
  }

  it('mientras se genera el QR muestra su skeleton, sin texto de carga', async () => {
    const { el } = await crear();

    expect(el.querySelector('ui-skeleton')).not.toBeNull();
    expect(el.textContent).not.toMatch(/generando/i);
    expect(el.querySelector('img')).toBeNull();
  });

  it('al llegar el QR quita el skeleton y muestra la imagen y el formulario', async () => {
    const { fixture, el } = await crear();
    await cargarQr(fixture);

    expect(el.querySelector('ui-skeleton')).toBeNull();
    expect(el.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,QR');
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('si falla, muestra el error con Reintentar y sin el formulario', async () => {
    const { fixture, el } = await crear();
    setup$.error(new Error('500'));
    fixture.detectChanges();

    expect(el.querySelector('form')).toBeNull();
    const reintentar = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar'));
    expect(reintentar).toBeDefined();

    setup$ = new Subject();
    reintentar?.click();
    fixture.detectChanges();

    expect(authService.getTwoFactorSetup).toHaveBeenCalledTimes(2);
    expect(el.querySelector('ui-skeleton')).not.toBeNull();
  });
});
