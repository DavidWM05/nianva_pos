import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuponService } from '../../cupon.service';
import { CuponCrearComponent } from './cupon-crear.component';

describe('CuponCrearComponent', () => {
  let fixture: ComponentFixture<CuponCrearComponent>;
  let cuponService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    cuponService = { crear: vi.fn().mockReturnValue(of({ id: 4, codigo: 'VERANO10' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CuponCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CuponService, useValue: cuponService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuponCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea el cupon y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ codigo: 'VERANO10', nombre: 'Verano', tipo: 'porcentaje', valor: 10 });

    expect(cuponService.crear).toHaveBeenCalledWith({ codigo: 'VERANO10', nombre: 'Verano', tipo: 'porcentaje', valor: 10 });
    expect(toastService.success).toHaveBeenCalledWith('Cupón creado.');
    expect(router.navigate).toHaveBeenCalledWith(['/precios/cupones', 4]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    cuponService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ codigo: 'VERANO10', nombre: 'Verano', tipo: 'porcentaje', valor: 10 });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear el cupón.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
