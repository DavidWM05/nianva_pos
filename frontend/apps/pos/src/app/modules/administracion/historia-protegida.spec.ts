import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../auth/auth-state.service';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { RolService, SucursalService, UsuarioAdmin, UsuarioAdminService } from '@nianva/domain-administracion';
import { RolesListComponent } from './pages/roles-list/roles-list.component';
import { UsuarioDetalleComponent } from './pages/usuario-detalle/usuario-detalle.component';
import { UsuariosListComponent } from './pages/usuarios-list/usuarios-list.component';

// DAT-10: las pantallas de administracion reaccionan por error_code (tiene_movimientos,
// ultimo_admin, desactivar_propio_usuario) y muestran el mensaje del backend; otro error usa
// el texto generico.
function errorNegocio(status: number, error_code: string, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { message, error_code } });
}

const usuario: UsuarioAdmin = {
  id: 6,
  nombre: 'Carlos',
  apellido: null,
  alias: null,
  correo: 'carlos@test.com',
  telefono: null,
  activo: true,
  ultimo_login: null,
  dos_factor_confirmado: false,
  sucursal: null,
  roles: [{ id: 1, nombre: 'admin' }],
};

describe('Historia protegida en administracion (DAT-10)', () => {
  describe('RolesListComponent', () => {
    async function crear(error: HttpErrorResponse) {
      const toast = { success: vi.fn(), error: vi.fn() };

      await TestBed.configureTestingModule({
        imports: [RolesListComponent],
        providers: [
          provideRouter([]),
          provideAnimationsAsync(),
          ...proveedoresDePantalla(),
          {
            provide: RolService,
            useValue: {
              listar: vi.fn().mockReturnValue(of({ data: [], total: 0, permisos: { crear: true, editar: true, eliminar: true } })),
              eliminar: vi.fn().mockReturnValue(throwError(() => error)),
            },
          },
          { provide: ConfirmDialogService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
          { provide: ToastService, useValue: toast },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(RolesListComponent);
      fixture.detectChanges();

      return { componente: fixture.componentInstance, toast };
    }

    it('un rol con usuarios (tiene_movimientos) muestra el mensaje del backend', async () => {
      const mensaje = 'No puedes eliminar un rol con usuarios asignados. Quita el rol de esos usuarios primero.';
      const { componente, toast } = await crear(errorNegocio(422, 'tiene_movimientos', mensaje));

      await componente.onEliminar({ id: 2, nombre: 'Cajero', descripcion: null, es_sistema: false, usuarios_count: 1 });

      expect(toast.error).toHaveBeenCalledWith(mensaje);
    });

    it('un 422 sin error_code de negocio usa el texto generico', async () => {
      const { componente, toast } = await crear(new HttpErrorResponse({ status: 422, error: { message: 'The given data was invalid.' } }));

      await componente.onEliminar({ id: 2, nombre: 'Cajero', descripcion: null, es_sistema: false, usuarios_count: 0 });

      expect(toast.error).toHaveBeenCalledWith('No se pudo eliminar el rol.');
    });
  });

  describe('UsuariosListComponent', () => {
    async function crear(error: HttpErrorResponse) {
      const toast = { success: vi.fn(), error: vi.fn() };

      await TestBed.configureTestingModule({
        imports: [UsuariosListComponent],
        providers: [
          provideRouter([]),
          provideAnimationsAsync(),
          ...proveedoresDePantalla(),
          {
            provide: UsuarioAdminService,
            useValue: {
              listar: vi.fn().mockReturnValue(of({ data: [], total: 0, permisos: { crear: true, editar: true, eliminar: true } })),
              desactivar: vi.fn().mockReturnValue(throwError(() => error)),
            },
          },
          { provide: AuthStateService, useValue: { usuario: signal({ id: 1 }) } },
          { provide: ConfirmDialogService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
          { provide: ToastService, useValue: toast },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(UsuariosListComponent);
      fixture.detectChanges();

      return { componente: fixture.componentInstance, toast };
    }

    it('desactivar al ultimo admin (ultimo_admin) muestra el mensaje del backend', async () => {
      const mensaje = 'Es el último administrador activo: no puedes desactivarlo ni quitarle el rol de administrador.';
      const { componente, toast } = await crear(errorNegocio(422, 'ultimo_admin', mensaje));

      await componente.onDesactivar(usuario);

      expect(toast.error).toHaveBeenCalledWith(mensaje);
    });

    it('desactivarse a uno mismo (desactivar_propio_usuario) muestra el mensaje del backend', async () => {
      const { componente, toast } = await crear(errorNegocio(403, 'desactivar_propio_usuario', 'No puedes desactivar tu propio usuario.'));

      await componente.onDesactivar(usuario);

      expect(toast.error).toHaveBeenCalledWith('No puedes desactivar tu propio usuario.');
    });

    it('otro error usa el texto generico', async () => {
      const { componente, toast } = await crear(new HttpErrorResponse({ status: 500, error: { message: 'Server Error' } }));

      await componente.onDesactivar(usuario);

      expect(toast.error).toHaveBeenCalledWith('No se pudo desactivar el usuario.');
    });
  });

  describe('UsuarioDetalleComponent', () => {
    async function crear(error: HttpErrorResponse) {
      const toast = { success: vi.fn(), error: vi.fn() };

      await TestBed.configureTestingModule({
        imports: [UsuarioDetalleComponent],
        deferBlockBehavior: DeferBlockBehavior.Manual,
        providers: [
          provideAnimationsAsync(),
          ...proveedoresDePantalla(),
          {
            provide: UsuarioAdminService,
            useValue: {
              obtener: vi.fn().mockReturnValue(of({ usuario, permisos: { editar: true, eliminar: true } })),
              actualizar: vi.fn().mockReturnValue(throwError(() => error)),
            },
          },
          { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
          { provide: ToastService, useValue: toast },
          { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
          { provide: RolService, useValue: { listarTodos: vi.fn().mockReturnValue(of([])) } },
          { provide: AuthStateService, useValue: { usuario: vi.fn().mockReturnValue({ id: 1, dos_factor_confirmado: false }) } },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '6' }) } } },
        ],
      }).compileComponents();

      const fixture = TestBed.createComponent(UsuarioDetalleComponent);
      fixture.detectChanges();

      return { componente: fixture.componentInstance, toast };
    }

    it('quitarle el rol admin al ultimo admin (ultimo_admin) muestra el mensaje del backend', async () => {
      const mensaje = 'Es el último administrador activo: no puedes desactivarlo ni quitarle el rol de administrador.';
      const { componente, toast } = await crear(errorNegocio(422, 'ultimo_admin', mensaje));

      componente.onGuardar({ nombre: 'Carlos', correo: 'carlos@test.com', roles: [2] });

      expect(toast.error).toHaveBeenCalledWith(mensaje);
    });

    it('otro error al guardar usa el texto generico', async () => {
      const { componente, toast } = await crear(new HttpErrorResponse({ status: 500 }));

      componente.onGuardar({ nombre: 'Carlos', correo: 'carlos@test.com' });

      expect(toast.error).toHaveBeenCalledWith('No se pudo guardar el usuario.');
    });
  });
});
