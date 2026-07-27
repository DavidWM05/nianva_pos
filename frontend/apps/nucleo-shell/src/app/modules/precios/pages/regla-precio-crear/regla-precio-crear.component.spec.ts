import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CATEGORIA, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { ReglaPrecioService } from '../../regla-precio.service';
import { ReglaPrecioCrearComponent } from './regla-precio-crear.component';

describe('ReglaPrecioCrearComponent', () => {
  let fixture: ComponentFixture<ReglaPrecioCrearComponent>;
  let reglaPrecioService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    reglaPrecioService = { crear: vi.fn().mockReturnValue(of({ id: 9, nombre: 'Descuento verano' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ReglaPrecioCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: ReglaPrecioService, useValue: reglaPrecioService },
        { provide: ToastService, useValue: toastService },
        { provide: BUSCADOR_CATEGORIA, useValue: { buscar: vi.fn().mockReturnValue(of([])) } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReglaPrecioCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea la regla y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ nombre: 'Descuento verano', tipo: 'porcentaje', aplica_a: 'todo' });

    expect(reglaPrecioService.crear).toHaveBeenCalledWith({ nombre: 'Descuento verano', tipo: 'porcentaje', aplica_a: 'todo' });
    expect(toastService.success).toHaveBeenCalledWith('Regla de precio creada.');
    expect(router.navigate).toHaveBeenCalledWith(['/precios/reglas', 9]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    reglaPrecioService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Descuento verano', tipo: 'porcentaje', aplica_a: 'todo' });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear la regla de precio.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
