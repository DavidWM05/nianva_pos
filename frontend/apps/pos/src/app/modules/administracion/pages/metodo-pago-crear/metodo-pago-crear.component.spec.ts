import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MetodoPagoAdminService } from '../../metodo-pago-admin.service';
import { MetodoPagoCrearComponent } from './metodo-pago-crear.component';

describe('MetodoPagoCrearComponent', () => {
  let fixture: ComponentFixture<MetodoPagoCrearComponent>;
  let metodoPagoService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    metodoPagoService = { crear: vi.fn().mockReturnValue(of({ id: 8, nombre: 'Vales de despensa' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MetodoPagoCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: MetodoPagoAdminService, useValue: metodoPagoService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MetodoPagoCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea el metodo de pago y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ nombre: 'Vales de despensa', tipo: 'otro', incluir_en_financiero: true });

    expect(metodoPagoService.crear).toHaveBeenCalledWith({
      nombre: 'Vales de despensa',
      tipo: 'otro',
      incluir_en_financiero: true,
    });
    expect(toastService.success).toHaveBeenCalledWith('Método de pago creado.');
    expect(router.navigate).toHaveBeenCalledWith(['/metodos-pago', 8]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    metodoPagoService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Vales de despensa', tipo: 'otro', incluir_en_financiero: true });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear el método de pago.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
