import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../auth-state.service';
import { AuthService } from '../../auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authService = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), AuthStateService, { provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('renderiza los campos de correo y contraseña', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Correo');
    expect(texto).toContain('Contraseña');
  });

  it('con two_factor_required=false navega al shell', () => {
    authService.login.mockReturnValue(of({ two_factor_required: false, user: { id: 1 } }));

    fixture.componentInstance.onSubmit({ correo: 'ana@test.com', password: 'secret' });

    expect(authService.login).toHaveBeenCalledWith('ana@test.com', 'secret');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('con two_factor_required=true navega a la verificacion en dos pasos', () => {
    authService.login.mockReturnValue(of({ two_factor_required: true }));

    fixture.componentInstance.onSubmit({ correo: 'ana@test.com', password: 'secret' });

    expect(router.navigate).toHaveBeenCalledWith(['/two-factor/verify']);
  });

  it('muestra un mensaje ante un 429 (rate limit)', () => {
    authService.login.mockReturnValue(throwError(() => ({ status: 429 })));

    fixture.componentInstance.onSubmit({ correo: 'ana@test.com', password: 'secret' });
    fixture.detectChanges();

    expect(fixture.componentInstance['errorGeneral']()).toContain('Demasiados intentos');
  });
});
