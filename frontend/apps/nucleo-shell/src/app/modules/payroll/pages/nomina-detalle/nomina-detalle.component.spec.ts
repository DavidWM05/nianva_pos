import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList (detras de
// RecordTabsComponent) en ngAfterViewInit. Mismo stub que
// cotizacion-detalle.component.spec.ts.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { NominaService } from '../../nomina.service';
import { Nomina } from '../../nomina.types';
import { NominaDetalleComponent } from './nomina-detalle.component';

describe('NominaDetalleComponent', () => {
  let fixture: ComponentFixture<NominaDetalleComponent>;
  let nominaService: { obtener: ReturnType<typeof vi.fn>; pagar: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function nominaCon(overrides: Partial<Nomina>): Nomina {
    return {
      id: 5,
      periodo_inicio: '2026-07-01',
      periodo_fin: '2026-07-15',
      total_percepciones: '4000.00',
      total_deducciones: '0.00',
      total_neto: '4000.00',
      estado: 'calculada',
      fecha_pago: null,
      detalles: [
        { id: 1, empleado: { id: 4, usuario: { id: 9, nombre: 'Carlos' } }, dias_trabajados: 15, percepciones: '4000.00', deducciones: '0.00', neto: '4000.00' },
      ],
      ...overrides,
    };
  }

  async function crearComponente(nomina: Nomina): Promise<void> {
    nominaService = { obtener: vi.fn().mockReturnValue(of(nomina)), pagar: vi.fn() };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NominaDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: NominaService, useValue: nominaService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NominaDetalleComponent);
    fixture.detectChanges();
  }

  it('carga la nomina por id de la ruta y muestra el nombre del empleado en los detalles', async () => {
    await crearComponente(nominaCon({}));

    expect(nominaService.obtener).toHaveBeenCalledWith(5);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Carlos');
  });

  it('sin nombre de empleado, cae a "Empleado #id"', async () => {
    await crearComponente(
      nominaCon({ detalles: [{ id: 1, empleado: { id: 4, usuario: null }, dias_trabajados: 15, percepciones: '4000.00', deducciones: '0.00', neto: '4000.00' }] }),
    );

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Empleado #4');
  });

  it('calculada: puedePagar() es verdadero; pagada: es falso', async () => {
    await crearComponente(nominaCon({ estado: 'calculada' }));
    expect(fixture.componentInstance['puedePagar']()).toBe(true);
  });

  it('pagar() llama al backend y recarga la nomina', async () => {
    await crearComponente(nominaCon({ estado: 'calculada' }));
    nominaService.pagar.mockReturnValue(of(nominaCon({ estado: 'pagada' })));

    fixture.componentInstance.pagar();

    expect(nominaService.pagar).toHaveBeenCalledWith(5);
    expect(toast.success).toHaveBeenCalledWith('Nómina pagada.');
    expect(nominaService.obtener).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al recargar
  });

  it('pagar() con error de negocio (ej. ya pagada) muestra el mensaje real', async () => {
    await crearComponente(nominaCon({ estado: 'calculada' }));
    nominaService.pagar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'Esta nómina ya fue pagada.', error_code: 'nomina_ya_pagada' } })),
    );

    fixture.componentInstance.pagar();

    expect(toast.error).toHaveBeenCalledWith('Esta nómina ya fue pagada.');
  });
});
