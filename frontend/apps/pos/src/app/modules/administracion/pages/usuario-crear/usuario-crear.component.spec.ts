import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { RolService } from '../../rol.service';
import { SucursalService } from '../../sucursal.service';
import { UsuarioAdminService } from '../../usuario-admin.service';
import { UsuarioCrearComponent } from './usuario-crear.component';

describe('UsuarioCrearComponent', () => {
  let fixture: ComponentFixture<UsuarioCrearComponent>;
  let usuarioService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    usuarioService = { crear: vi.fn().mockReturnValue(of({ id: 6, nombre: 'Carlos Ruiz' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UsuarioCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: UsuarioAdminService, useValue: usuarioService },
        { provide: ToastService, useValue: toastService },
        { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: RolService, useValue: { listarTodos: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea el usuario y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({
      nombre: 'Carlos Ruiz',
      correo: 'carlos@test.com',
      password: 'password-valida-123',
      roles: [],
    });

    expect(usuarioService.crear).toHaveBeenCalledWith({
      nombre: 'Carlos Ruiz',
      correo: 'carlos@test.com',
      password: 'password-valida-123',
      roles: [],
    });
    expect(toastService.success).toHaveBeenCalledWith('Usuario creado.');
    expect(router.navigate).toHaveBeenCalledWith(['/usuarios', 6]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    usuarioService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Carlos Ruiz', correo: 'carlos@test.com', roles: [] });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear el usuario.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
