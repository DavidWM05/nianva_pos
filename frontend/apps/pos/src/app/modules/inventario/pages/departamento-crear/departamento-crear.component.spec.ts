import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { DepartamentoService } from '../../departamento.service';
import { DepartamentoCrearComponent } from './departamento-crear.component';

describe('DepartamentoCrearComponent', () => {
  let fixture: ComponentFixture<DepartamentoCrearComponent>;
  let departamentoService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    departamentoService = { crear: vi.fn().mockReturnValue(of({ id: 5, nombre: 'Damas' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DepartamentoCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: DepartamentoService, useValue: departamentoService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DepartamentoCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea el departamento y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ nombre: 'Damas' });

    expect(departamentoService.crear).toHaveBeenCalledWith({ nombre: 'Damas' });
    expect(toastService.success).toHaveBeenCalledWith('Departamento creado.');
    expect(router.navigate).toHaveBeenCalledWith(['/inventario/departamentos', 5]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    departamentoService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Damas' });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear el departamento.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
