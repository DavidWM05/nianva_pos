import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ConfirmDialogService, ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RolService } from '../../rol.service';
import { Rol, RolesPagina } from '../../rol.types';
import { RolesListComponent } from './roles-list.component';

describe('RolesListComponent', () => {
  let fixture: ComponentFixture<RolesListComponent>;
  let rolService: { listar: ReturnType<typeof vi.fn>; eliminar: ReturnType<typeof vi.fn> };
  let router: Router;

  const roles: Rol[] = [
    { id: 1, nombre: 'admin', descripcion: 'Acceso total', es_sistema: true, usuarios_count: 2 },
    { id: 2, nombre: 'Cajero', descripcion: null, es_sistema: false, usuarios_count: 0 },
  ];

  function paginaCon(permisos: RolesPagina['permisos']): RolesPagina {
    return { data: roles, total: roles.length, permisos };
  }

  async function crearComponente(permisos: RolesPagina['permisos']): Promise<void> {
    rolService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), eliminar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RolesListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: RolService, useValue: rolService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolesListComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza los roles de la primera carga', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('admin');
    expect(texto).toContain('Cajero');
  });

  it('"Nuevo rol" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/roles/nuevo"]');
    expect(enlace).toBeTruthy();
  });

  it('un rol de sistema nunca muestra el boton de eliminar, aunque el usuario tenga el permiso', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const botonesEliminar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Eliminar"]');
    // Solo 1 fila (Cajero) puede eliminarse -- "admin" es es_sistema.
    expect(botonesEliminar.length).toBe(1);
  });

  it('sin el permiso roles.eliminar, ninguna fila muestra el boton de eliminar', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: false });

    const botonesEliminar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Eliminar"]');
    expect(botonesEliminar.length).toBe(0);
  });

  it('la busqueda (con debounce) vuelve a pedir la lista con el filtro de nombre', async () => {
    vi.useFakeTimers();
    await crearComponente({ crear: true, editar: true, eliminar: true });

    fixture.componentInstance.onBuscarInput('cajero');
    expect(rolService.listar).toHaveBeenCalledTimes(1); // todavia no, esta en debounce

    vi.advanceTimersByTime(300);

    expect(rolService.listar).toHaveBeenCalledTimes(2);
    expect(rolService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), 'cajero');
  });
});
