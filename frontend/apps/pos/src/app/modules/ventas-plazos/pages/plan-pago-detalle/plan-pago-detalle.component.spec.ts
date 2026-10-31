import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList (detras de
// RecordTabsComponent) en ngAfterViewInit.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { PlanPagoService } from '../../plan-pago.service';
import { PlanPago } from '../../plan-pago.types';
import { PlanPagoDetalleComponent } from './plan-pago-detalle.component';

describe('PlanPagoDetalleComponent', () => {
  let fixture: ComponentFixture<PlanPagoDetalleComponent>;
  let planPagoService: { obtener: ReturnType<typeof vi.fn>; pagarCuota: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function planCon(overrides: Partial<PlanPago>): PlanPago {
    return {
      id: 7,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      venta_id: 3,
      concepto: 'Venta #3 - Pago a plazos',
      monto_total: '550.00',
      interes_total: '50.00',
      tasa_interes: '10.00',
      numero_cuotas: 2,
      periodicidad: 'mensual',
      fecha_inicio: '2026-07-27',
      cuotas: [
        { id: 1, numero_cuota: 1, monto: '275.00', monto_capital: '250.00', monto_interes: '25.00', fecha_vencimiento: '2026-07-27', fecha_pago: null, estado: 'pendiente' },
      ],
      created_at: '2026-07-27T10:00:00Z',
      ...overrides,
    };
  }

  async function crearComponente(plan: PlanPago): Promise<void> {
    planPagoService = { obtener: vi.fn().mockReturnValue(of(plan)), pagarCuota: vi.fn() };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PlanPagoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: PlanPagoService, useValue: planPagoService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanPagoDetalleComponent);
    fixture.detectChanges();
  }

  it('carga el plan y muestra sus cuotas', async () => {
    await crearComponente(planCon({}));

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(texto).toContain('$275.00');
  });

  it('confirmarPagarCuota() manda cuota_id y monto, y recarga el plan', async () => {
    const plan = planCon({});
    const cuota = plan.cuotas?.[0];
    if (!cuota) throw new Error('fixture sin cuotas');
    await crearComponente(plan);
    planPagoService.pagarCuota.mockReturnValue(of(cuota));

    fixture.componentInstance.abrirPagarCuota(cuota);
    fixture.componentInstance.confirmarPagarCuota();

    expect(planPagoService.pagarCuota).toHaveBeenCalledWith(7, { cuota_id: 1, monto: 275 });
    expect(toast.success).toHaveBeenCalled();
  });

  it('si la cuota ya estaba pagada, recarga el plan', async () => {
    const plan = planCon({});
    const cuota = plan.cuotas?.[0];
    if (!cuota) throw new Error('fixture sin cuotas');
    await crearComponente(plan);
    planPagoService.pagarCuota.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { message: 'La cuota ya esta pagada.', error_code: 'cuota_ya_pagada', plan_pago_id: 7, cuota_id: 1 },
          }),
      ),
    );

    fixture.componentInstance.abrirPagarCuota(cuota);
    fixture.componentInstance.confirmarPagarCuota();

    expect(toast.error).toHaveBeenCalledWith('La cuota ya esta pagada.');
    expect(planPagoService.obtener).toHaveBeenCalledTimes(2);
  });
});
