import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_VENTA } from '../../../../core/buscadores-entidad.tokens';
import { PlanPagoService } from '../../plan-pago.service';
import { PlanPago } from '../../plan-pago.types';
import { PlanPagoFormComponent } from './plan-pago-form.component';

describe('PlanPagoFormComponent', () => {
  let fixture: ComponentFixture<PlanPagoFormComponent>;
  let planPagoService: { crearPlan: ReturnType<typeof vi.fn> };
  let router: Router;

  const planCreado: PlanPago = {
    id: 7,
    venta_id: 3,
    concepto: 'Venta #3 - Pago a plazos',
    monto_total: '550.00',
    interes_total: '50.00',
    tasa_interes: '10.00',
    numero_cuotas: 6,
    periodicidad: 'mensual',
    fecha_inicio: '2026-07-27',
    created_at: '2026-07-27T10:00:00Z',
  };

  async function crearComponente(): Promise<void> {
    planPagoService = { crearPlan: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PlanPagoFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PlanPagoService, useValue: planPagoService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: BUSCADOR_VENTA, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanPagoFormComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('crear() sin venta u numero de cuotas invalido no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.crear();

    expect(planPagoService.crearPlan).not.toHaveBeenCalled();
  });

  it('crear() manda el payload correcto y navega al detalle', async () => {
    await crearComponente();
    planPagoService.crearPlan.mockReturnValue(of(planCreado));

    fixture.componentInstance['ventaId'].set(3);
    fixture.componentInstance['numeroCuotas'].set(6);
    fixture.componentInstance['tasaInteres'].set(10);
    fixture.componentInstance.crear();

    expect(planPagoService.crearPlan).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ numero_cuotas: 6, tasa_interes: 10, periodicidad: 'mensual' }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/ventas-plazos', 7]);
  });

  it('si la venta ya tiene plan activo, navega al plan existente', async () => {
    await crearComponente();
    const toast = TestBed.inject(ToastService);
    const errorSpy = vi.spyOn(toast, 'error');
    planPagoService.crearPlan.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: {
              message: 'La venta 3 ya tiene un plan de pago activo.',
              error_code: 'plan_pago_ya_activo',
              venta_id: 3,
              plan_pago_id: 9,
            },
          }),
      ),
    );

    fixture.componentInstance['ventaId'].set(3);
    fixture.componentInstance['numeroCuotas'].set(6);
    fixture.componentInstance.crear();

    expect(errorSpy).toHaveBeenCalledWith('La venta 3 ya tiene un plan de pago activo.');
    expect(router.navigate).toHaveBeenCalledWith(['/ventas-plazos', 9]);
  });
});
