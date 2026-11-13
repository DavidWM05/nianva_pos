import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { UsuarioAdminService } from '../../usuario-admin.service';
import { UsuarioAdmin } from '../../usuario.types';
import { UsuariosListComponent } from './usuarios-list.component';

/**
 * UI-07: el backend rechaza desactivar al propio usuario (403 en UsuarioController::destroy).
 * En la fila de quien tiene la sesion, "Desactivar" se ve deshabilitada con su motivo.
 */
describe('UsuariosListComponent: desactivar al propio usuario', () => {
  const MOTIVO = 'No puedes desactivar tu propio usuario';

  function usuario(id: number, nombre: string): UsuarioAdmin {
    return {
      id,
      nombre,
      apellido: null,
      alias: null,
      correo: `${nombre.toLowerCase()}@test.com`,
      telefono: null,
      activo: true,
      ultimo_login: null,
      dos_factor_confirmado: false,
      sucursal: null,
      roles: [],
    };
  }

  async function crear(): Promise<{
    fixture: ComponentFixture<UsuariosListComponent>;
    desactivar: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
  }> {
    const desactivar = vi.fn().mockReturnValue(of(undefined));
    const confirm = vi.fn().mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [UsuariosListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        ...proveedoresDePantalla(),
        {
          provide: UsuarioAdminService,
          useValue: {
            listar: vi.fn().mockReturnValue(
              of({
                data: [usuario(1, 'Ana'), usuario(2, 'Carlos')],
                total: 2,
                permisos: { crear: true, editar: true, eliminar: true },
              }),
            ),
            desactivar,
          },
        },
        // La sesion ya cargada: el usuario 1 es quien entro.
        { provide: AuthStateService, useValue: { usuario: signal({ id: 1 }) } },
        { provide: ConfirmDialogService, useValue: { confirm } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuariosListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, desactivar, confirm };
  }

  function filaDe(fixture: ComponentFixture<UsuariosListComponent>, nombre: string): HTMLElement {
    const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody tr'));
    const fila = filas.find((tr) => tr.textContent?.includes(nombre));
    if (!fila) throw new Error(`Sin fila para ${nombre}`);

    return fila;
  }

  it('en la fila del usuario de la sesion, "Desactivar" esta deshabilitada con su motivo y no llama al servicio', async () => {
    const { fixture, desactivar, confirm } = await crear();

    const boton = filaDe(fixture, 'Ana').querySelector<HTMLButtonElement>('button[aria-label^="Desactivar"]');

    expect(boton).not.toBeNull();
    expect(boton?.getAttribute('aria-label')).toBe(`Desactivar: ${MOTIVO}`);
    expect(boton?.disabled).toBe(true);

    boton?.click();
    await fixture.whenStable();

    expect(confirm).not.toHaveBeenCalled();
    expect(desactivar).not.toHaveBeenCalled();
  });

  it('en las demas filas activas, "Desactivar" sigue disponible', async () => {
    const { fixture, desactivar, confirm } = await crear();

    const boton = filaDe(fixture, 'Carlos').querySelector<HTMLButtonElement>('button[aria-label^="Desactivar"]');

    expect(boton?.getAttribute('aria-label')).toBe('Desactivar');
    expect(boton?.disabled).toBe(false);

    boton?.click();
    await fixture.whenStable();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(desactivar).toHaveBeenCalledWith(2);
  });
});
