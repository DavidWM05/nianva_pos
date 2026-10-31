import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PermisoService } from '../../permiso.service';
import { RolService } from '../../rol.service';
import { RolCrearComponent } from './rol-crear.component';

describe('RolCrearComponent', () => {
  let fixture: ComponentFixture<RolCrearComponent>;
  let rolService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    rolService = { crear: vi.fn().mockReturnValue(of({ id: 7, nombre: 'Cajero' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RolCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: RolService, useValue: rolService },
        { provide: ToastService, useValue: toastService },
        { provide: PermisoService, useValue: { agrupadosPorModulo: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RolCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea el rol y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ nombre: 'Cajero', permisos: [1, 2] });

    expect(rolService.crear).toHaveBeenCalledWith({ nombre: 'Cajero', permisos: [1, 2] });
    expect(toastService.success).toHaveBeenCalledWith('Rol creado.');
    expect(router.navigate).toHaveBeenCalledWith(['/roles', 7]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    rolService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Cajero', permisos: [] });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear el rol.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
