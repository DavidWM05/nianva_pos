import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ToastService } from '@nianva/ui-shared';
import { ConfirmationService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../../auth/auth-state.service';
import { Usuario } from '../../../auth/usuario.types';
import { SeguridadService } from '../../seguridad.service';
import { PreferenciasComponent } from './preferencias.component';

describe('PreferenciasComponent', () => {
  let fixture: ComponentFixture<PreferenciasComponent>;
  let seguridadService: {
    listarDispositivosConfiables: ReturnType<typeof vi.fn>;
    revocarDispositivo: ReturnType<typeof vi.fn>;
    revocarTodosLosDispositivos: ReturnType<typeof vi.fn>;
    cambiarPassword: ReturnType<typeof vi.fn>;
  };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let authStateService: { usuario: ReturnType<typeof vi.fn> };

  const usuarioSinDosFactor: Usuario = {
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
  };

  async function crearComponente(usuario: Usuario): Promise<void> {
    seguridadService = {
      listarDispositivosConfiables: vi.fn().mockReturnValue(of([])),
      revocarDispositivo: vi.fn().mockReturnValue(of(void 0)),
      revocarTodosLosDispositivos: vi.fn().mockReturnValue(of(void 0)),
      cambiarPassword: vi.fn().mockReturnValue(of(void 0)),
    };
    toastService = { success: vi.fn(), error: vi.fn() };
    authStateService = { usuario: vi.fn().mockReturnValue(usuario) };

    await TestBed.configureTestingModule({
      imports: [PreferenciasComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        ConfirmationService,
        { provide: SeguridadService, useValue: seguridadService },
        { provide: ToastService, useValue: toastService },
        { provide: AuthStateService, useValue: authStateService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreferenciasComponent);
    fixture.detectChanges();
  }

  it('no ofrece desactivar 2FA -- esa accion ya no es autoservicio', async () => {
    await crearComponente(usuarioSinDosFactor);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Desactivar 2FA');
  });

  it('sin 2FA en la cuenta, cambiar la contraseña se manda directo, sin pedir codigo', async () => {
    await crearComponente(usuarioSinDosFactor);

    fixture.componentInstance.onGuardarPassword({
      password_actual: 'actual-123',
      password: 'nueva-password-456',
      password_confirmation: 'nueva-password-456',
    });

    expect(seguridadService.cambiarPassword).toHaveBeenCalledWith({
      password_actual: 'actual-123',
      password: 'nueva-password-456',
      password_confirmation: 'nueva-password-456',
    });
    expect(toastService.success).toHaveBeenCalledWith('Contraseña actualizada.');
  });

  it('con 2FA en la cuenta, cambiar la contraseña primero pide el codigo TOTP', async () => {
    await crearComponente({ ...usuarioSinDosFactor, dos_factor_confirmado: true });

    fixture.componentInstance.onGuardarPassword({
      password_actual: 'actual-123',
      password: 'nueva-password-456',
      password_confirmation: 'nueva-password-456',
    });
    fixture.detectChanges();

    expect(seguridadService.cambiarPassword).not.toHaveBeenCalled();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('código de verificación');

    fixture.componentInstance.onCodigoPassword('123456');

    expect(seguridadService.cambiarPassword).toHaveBeenCalledWith({
      password_actual: 'actual-123',
      password: 'nueva-password-456',
      password_confirmation: 'nueva-password-456',
      code: '123456',
    });
  });

  it('un codigo invalido deja al usuario en el paso de confirmacion, con un mensaje claro', async () => {
    await crearComponente({ ...usuarioSinDosFactor, dos_factor_confirmado: true });
    seguridadService.cambiarPassword.mockReturnValue(
      throwError(() => ({ status: 422, error: { errors: { code: ['Codigo invalido.'] } } })),
    );

    fixture.componentInstance.onGuardarPassword({
      password_actual: 'actual-123',
      password: 'nueva-password-456',
      password_confirmation: 'nueva-password-456',
    });
    fixture.componentInstance.onCodigoPassword('000000');
    fixture.detectChanges();

    expect(fixture.componentInstance['pendientePassword']()).not.toBeNull();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Código inválido.');
  });

  it('una contraseña actual incorrecta vuelve a mostrar el formulario, no el paso de codigo', async () => {
    await crearComponente({ ...usuarioSinDosFactor, dos_factor_confirmado: true });
    seguridadService.cambiarPassword.mockReturnValue(
      throwError(() => ({ status: 422, error: { errors: { password_actual: ['La contrasena actual no es correcta.'] } } })),
    );

    fixture.componentInstance.onGuardarPassword({
      password_actual: 'incorrecta',
      password: 'nueva-password-456',
      password_confirmation: 'nueva-password-456',
    });
    fixture.componentInstance.onCodigoPassword('123456');
    fixture.detectChanges();

    expect(fixture.componentInstance['pendientePassword']()).toBeNull();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('código de verificación');
    expect(texto).toContain('La contrasena actual no es correcta.');
  });
});
