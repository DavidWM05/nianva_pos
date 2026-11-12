import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../auth-state.service';
import { AuthService } from '../auth.service';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { LoginComponent } from './login/login.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

// 50j (UI-18): mientras la pantalla espera la respuesta, el boton que envia queda deshabilitado.
// El primer correo de recuperacion tarda segundos en salir y antes no habia ninguna senal.
interface Caso {
  pantalla: Type<unknown>;
  metodo: 'login' | 'requestPasswordReset' | 'resetPassword';
  boton: string;
  valor: Record<string, unknown>;
}

const CASOS: Caso[] = [
  { pantalla: LoginComponent, metodo: 'login', boton: 'Iniciar sesión', valor: { correo: 'ana@test.com', password: 'secreto' } },
  { pantalla: ForgotPasswordComponent, metodo: 'requestPasswordReset', boton: 'Enviar enlace', valor: { correo: 'ana@test.com' } },
  {
    pantalla: ResetPasswordComponent,
    metodo: 'resetPassword',
    boton: 'Restablecer contraseña',
    valor: { password: 'nueva-123', password_confirmation: 'nueva-123' },
  },
];

describe('pantallas de auth: el boton de enviar mientras se espera la respuesta', () => {
  for (const { pantalla, metodo, boton, valor } of CASOS) {
    it(`${boton}: queda deshabilitado con aria-busy y se libera al responder`, async () => {
      const respuesta = new Subject<Record<string, unknown>>();
      const authService = { [metodo]: vi.fn(() => respuesta) };

      await TestBed.configureTestingModule({
        imports: [pantalla],
        providers: [
          provideRouter([{ path: '**', children: [] }]),
          provideAnimationsAsync(),
          AuthStateService,
          { provide: AuthService, useValue: authService },
        ],
      }).compileComponents();
      await TestBed.inject(Router).navigateByUrl('/reset-password?token=t&correo=ana%40test.com');
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      const fixture = TestBed.createComponent(pantalla);
      fixture.detectChanges();
      const enviar = () =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button[type="submit"]')].find(
          (b) => b.textContent?.trim() === boton,
        );
      expect(enviar()?.disabled).toBe(false);

      (fixture.componentInstance as { onSubmit(v: Record<string, unknown>): void }).onSubmit(valor);
      fixture.detectChanges();

      expect(authService[metodo]).toHaveBeenCalledTimes(1);
      expect(enviar()?.disabled).toBe(true);
      expect(enviar()?.getAttribute('aria-busy')).toBe('true');

      respuesta.next({ status: 'Enviado.', two_factor_required: false, user: null });
      respuesta.complete();
      fixture.detectChanges();

      expect(enviar()?.disabled).toBe(false);
    });
  }
});
