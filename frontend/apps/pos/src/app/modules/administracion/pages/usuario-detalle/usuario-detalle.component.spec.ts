import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, DynamicFormComponent, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList detras de
// RecordTabsComponent (ver el mismo stub en cliente-detalle.component.spec.ts).
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { AuthStateService } from '../../../../auth/auth-state.service';
import { Usuario } from '../../../../auth/usuario.types';
import { RolService } from '../../rol.service';
import { SucursalService } from '../../sucursal.service';
import { UsuarioAdminService } from '../../usuario-admin.service';
import { UsuarioAdmin } from '../../usuario.types';
import { UsuarioDetalleComponent } from './usuario-detalle.component';

describe('UsuarioDetalleComponent', () => {
  let fixture: ComponentFixture<UsuarioDetalleComponent>;
  let usuarioService: {
    obtener: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    desactivarDosFactor: ReturnType<typeof vi.fn>;
  };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const usuario: UsuarioAdmin = {
    id: 6,
    nombre: 'Carlos',
    apellido: 'Ruiz',
    alias: null,
    correo: 'carlos@test.com',
    telefono: null,
    activo: true,
    ultimo_login: null,
    dos_factor_confirmado: false,
    sucursal: null,
    roles: [],
  };

  const admin: Usuario = {
    id: 1,
    nombre: 'Ana',
    apellido: null,
    correo: 'ana@test.com',
    tenant_id: 1,
    sucursal_id: 1,
    es_superadmin: false,
    roles: ['admin'],
    requiere_dos_factor: true,
    dos_factor_confirmado: false,
  };

  function providers(
    permisos: { editar: boolean; eliminar: boolean },
    usuarioObjetivo: UsuarioAdmin,
    adminActual: Usuario,
  ) {
    usuarioService = {
      obtener: vi.fn().mockReturnValue(of({ usuario: usuarioObjetivo, permisos })),
      actualizar: vi.fn(),
      desactivarDosFactor: vi.fn().mockReturnValue(of({ ...usuarioObjetivo, dos_factor_confirmado: false })),
    };
    toastService = { success: vi.fn(), error: vi.fn() };

    return [
      provideAnimationsAsync(),
      providePrimeNG(),
      { provide: UsuarioAdminService, useValue: usuarioService },
      { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      { provide: ToastService, useValue: toastService },
      { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      { provide: RolService, useValue: { listarTodos: vi.fn().mockReturnValue(of([])) } },
      { provide: AuthStateService, useValue: { usuario: vi.fn().mockReturnValue(adminActual) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '6' }) } } },
    ];
  }

  async function crearComponente(
    usuarioObjetivo: UsuarioAdmin = usuario,
    permisos: { editar: boolean; eliminar: boolean } = { editar: true, eliminar: true },
    adminActual: Usuario = admin,
  ): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [UsuarioDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: providers(permisos, usuarioObjetivo, adminActual),
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioDetalleComponent);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await crearComponente();
  });

  it('renderiza las 2 pestañas y el nombre del usuario', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Carlos');
    expect(texto).toContain('General');
    expect(texto).toContain('Auditoría');
  });

  it('el tab de Auditoría no renderiza nucleo-audit-log-viewer hasta que el bloque @defer se activa', async () => {
    const bloques = await fixture.getDeferBlocks();
    expect(bloques).toHaveLength(1);

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).toBeNull();

    await bloques[0].render(DeferBlockState.Complete);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).not.toBeNull();
  });

  it('sin permiso de editar, muestra el mismo formulario deshabilitado (visualizar), no lo oculta', async () => {
    await crearComponente(usuario, { editar: false, eliminar: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para editar usuarios');

    const formulario = fixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });

  it('sin 2FA activo en el usuario objetivo, no ofrece desactivarlo', async () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Desactivar 2FA de este usuario');
  });

  it('sin permiso de editar, no ofrece desactivar 2FA aunque el usuario lo tenga activo', async () => {
    await crearComponente({ ...usuario, dos_factor_confirmado: true }, { editar: false, eliminar: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Desactivar 2FA de este usuario');
  });

  it('con 2FA activo y el admin sin 2FA propio, desactiva directo sin pedir codigo', async () => {
    await crearComponente({ ...usuario, dos_factor_confirmado: true }, { editar: true, eliminar: true }, { ...admin, dos_factor_confirmado: false });

    fixture.componentInstance.iniciarDesactivar2fa();

    expect(usuarioService.desactivarDosFactor).toHaveBeenCalledWith(usuario.id, undefined);
    expect(toastService.success).toHaveBeenCalledWith('Se desactivó la verificación en dos pasos de este usuario.');
  });

  it('con 2FA activo y el admin CON 2FA propio, primero pide el TOTP del admin', async () => {
    await crearComponente({ ...usuario, dos_factor_confirmado: true }, { editar: true, eliminar: true }, { ...admin, dos_factor_confirmado: true });
    fixture.detectChanges();

    fixture.componentInstance.iniciarDesactivar2fa();
    fixture.detectChanges();

    expect(usuarioService.desactivarDosFactor).not.toHaveBeenCalled();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('confirma TU código de verificación actual');

    fixture.componentInstance.onCodigoDesactivar2fa('123456');

    expect(usuarioService.desactivarDosFactor).toHaveBeenCalledWith(usuario.id, '123456');
  });

  it('un codigo invalido muestra un error claro y no desactiva nada', async () => {
    await crearComponente({ ...usuario, dos_factor_confirmado: true }, { editar: true, eliminar: true }, { ...admin, dos_factor_confirmado: true });
    usuarioService.desactivarDosFactor.mockReturnValue(throwError(() => ({ status: 422 })));

    fixture.componentInstance.iniciarDesactivar2fa();
    fixture.componentInstance.onCodigoDesactivar2fa('000000');
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Código inválido.');
  });

  it('si el usuario objetivo requiere 2FA por su rol, el backend rechaza y se muestra un toast', async () => {
    await crearComponente({ ...usuario, dos_factor_confirmado: true }, { editar: true, eliminar: true }, { ...admin, dos_factor_confirmado: false });
    usuarioService.desactivarDosFactor.mockReturnValue(throwError(() => ({ status: 403 })));

    fixture.componentInstance.iniciarDesactivar2fa();

    expect(toastService.error).toHaveBeenCalledWith('La verificación en dos pasos es obligatoria para el rol de este usuario.');
  });
});
