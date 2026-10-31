import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList (detras de
// RecordTabsComponent) en ngAfterViewInit. Mismo stub que
// cliente-detalle.component.spec.ts.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { MetodoPagoService } from '../../../tpv/metodo-pago.service';
import { CotizacionService } from '../../cotizacion.service';
import { Cotizacion } from '../../cotizacion.types';
import { CotizacionDetalleComponent } from './cotizacion-detalle.component';

describe('CotizacionDetalleComponent', () => {
  let fixture: ComponentFixture<CotizacionDetalleComponent>;
  let cotizacionService: { obtener: ReturnType<typeof vi.fn>; convertir: ReturnType<typeof vi.fn>; anular: ReturnType<typeof vi.fn> };
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  function cotizacionCon(overrides: Partial<Cotizacion>): Cotizacion {
    return {
      id: 5,
      numero_cotizacion: 'COT-000005',
      cliente: { id: 9, nombre: 'Juan Pérez' },
      total: '500.00',
      descuento: '0.00',
      estado: 'pendiente',
      validez_dias: 15,
      fecha_vencimiento: '2026-08-15',
      observaciones: null,
      uso_cfdi: null,
      venta_id: null,
      detalles: [],
      created_at: '2026-07-27T10:00:00Z',
      updated_at: '2026-07-27T10:00:00Z',
      ...overrides,
    };
  }

  async function crearComponente(cotizacion: Cotizacion): Promise<void> {
    cotizacionService = {
      obtener: vi.fn().mockReturnValue(of(cotizacion)),
      convertir: vi.fn(),
      anular: vi.fn(),
    };
    confirmDialog = { confirm: vi.fn().mockResolvedValue(true) };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CotizacionDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CotizacionService, useValue: cotizacionService },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CotizacionDetalleComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('pendiente, no vencida, con cliente: puedeConvertir() es verdadero', async () => {
    await crearComponente(cotizacionCon({ estado: 'pendiente', fecha_vencimiento: '2030-01-01', cliente: { id: 9, nombre: 'Juan' } }));

    expect(fixture.componentInstance['puedeConvertir']()).toBe(true);
  });

  it('vencida (fecha_vencimiento en el pasado): puedeConvertir() es falso aunque este pendiente', async () => {
    await crearComponente(cotizacionCon({ estado: 'pendiente', fecha_vencimiento: '2020-01-01' }));

    expect(fixture.componentInstance['puedeConvertir']()).toBe(false);
  });

  it('sin cliente: puedeConvertir() es falso (CotizacionService.convertirAVenta exige cliente)', async () => {
    await crearComponente(cotizacionCon({ estado: 'pendiente', fecha_vencimiento: '2030-01-01', cliente: null }));

    expect(fixture.componentInstance['puedeConvertir']()).toBe(false);
  });

  it('ya convertida: puedeConvertir(), puedeEditar() y puedeAnular() son todos falsos', async () => {
    await crearComponente(cotizacionCon({ estado: 'convertida', venta_id: 88 }));

    expect(fixture.componentInstance['puedeConvertir']()).toBe(false);
    expect(fixture.componentInstance['puedeEditar']()).toBe(false);
    expect(fixture.componentInstance['puedeAnular']()).toBe(false);
  });

  it('confirmarConvertir() llama a convertir() y navega a la venta creada', async () => {
    await crearComponente(cotizacionCon({ estado: 'pendiente', fecha_vencimiento: '2030-01-01' }));
    cotizacionService.convertir.mockReturnValue(of({ ventaId: 42 }));

    fixture.componentInstance.abrirConvertir();
    fixture.componentInstance['metodoPagoElegido'].set(1);
    fixture.componentInstance.confirmarConvertir();

    expect(cotizacionService.convertir).toHaveBeenCalledWith(5, 1);
    expect(router.navigate).toHaveBeenCalledWith(['/tpv/ventas', 42]);
  });

  it('confirmarConvertir() con error de negocio (ej. cotizacion_vencida) muestra el mensaje real', async () => {
    await crearComponente(cotizacionCon({ estado: 'pendiente', fecha_vencimiento: '2030-01-01' }));
    cotizacionService.convertir.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'La cotización ya venció.', error_code: 'cotizacion_vencida' } })),
    );

    fixture.componentInstance.abrirConvertir();
    fixture.componentInstance['metodoPagoElegido'].set(1);
    fixture.componentInstance.confirmarConvertir();

    expect(toast.error).toHaveBeenCalledWith('La cotización ya venció.');
  });

  it('anular() pide confirmación antes de llamar al backend', async () => {
    await crearComponente(cotizacionCon({ estado: 'pendiente' }));
    confirmDialog.confirm.mockResolvedValue(false);

    await fixture.componentInstance.anular();

    expect(cotizacionService.anular).not.toHaveBeenCalled();
  });

  it('anular() confirmado llama al backend y recarga la cotización', async () => {
    await crearComponente(cotizacionCon({ estado: 'pendiente' }));
    cotizacionService.anular.mockReturnValue(of(undefined));

    await fixture.componentInstance.anular();

    expect(cotizacionService.anular).toHaveBeenCalledWith(5);
    expect(toast.success).toHaveBeenCalledWith('Cotización anulada.');
    expect(cotizacionService.obtener).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al recargar
  });
});
