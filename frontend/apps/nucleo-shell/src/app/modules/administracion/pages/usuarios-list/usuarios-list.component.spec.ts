import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ConfirmDialogService, ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UsuarioAdminService } from '../../usuario-admin.service';
import { UsuarioAdmin, UsuariosPagina } from '../../usuario.types';
import { UsuariosListComponent } from './usuarios-list.component';

describe('UsuariosListComponent', () => {
  let fixture: ComponentFixture<UsuariosListComponent>;
  let usuarioService: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn> };
  let router: Router;

  const usuarios: UsuarioAdmin[] = [
    {
      id: 1,
      nombre: 'Ana',
      apellido: 'Pérez',
      alias: null,
      correo: 'ana@test.com',
      telefono: null,
      activo: true,
      ultimo_login: null,
      dos_factor_confirmado: false,
      sucursal: { id: 1, nombre: 'Centro' },
      roles: [{ id: 1, nombre: 'Admin' }],
    },
    {
      id: 2,
      nombre: 'Carlos',
      apellido: null,
      alias: null,
      correo: 'carlos@test.com',
      telefono: null,
      activo: true,
      ultimo_login: null,
      dos_factor_confirmado: false,
      sucursal: null,
      roles: [],
    },
  ];

  function paginaCon(permisos: UsuariosPagina['permisos']): UsuariosPagina {
    return { data: usuarios, total: usuarios.length, permisos };
  }

  async function crearComponente(permisos: UsuariosPagina['permisos']): Promise<void> {
    usuarioService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), desactivar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UsuariosListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: UsuarioAdminService, useValue: usuarioService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosListComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza los usuarios de la primera carga, con roles y sucursal', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana');
    expect(texto).toContain('Centro');
    expect(texto).toContain('Admin');
    expect(texto).toContain('Carlos');
  });

  it('oculta "Nuevo usuario" sin el permiso usuarios.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo usuario');
  });

  it('"Nuevo usuario" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/usuarios/nuevo"]');
    expect(enlace).toBeTruthy();
  });

  it('sin el permiso usuarios.eliminar, ninguna fila muestra el boton de desactivar', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: false });

    const botonesDesactivar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Desactivar"]');
    expect(botonesDesactivar.length).toBe(0);
  });

  it('la busqueda (con debounce) vuelve a pedir la lista con el filtro de nombre', async () => {
    vi.useFakeTimers();
    await crearComponente({ crear: true, editar: true, eliminar: true });

    fixture.componentInstance.onBuscarInput('ana');
    expect(usuarioService.listar).toHaveBeenCalledTimes(1); // todavia no, esta en debounce

    vi.advanceTimersByTime(300);

    expect(usuarioService.listar).toHaveBeenCalledTimes(2);
    expect(usuarioService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), 'ana');
  });
});
