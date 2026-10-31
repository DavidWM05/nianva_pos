import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nianva/ui-shared';
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

import { MetodoPagoService } from '../../../tpv/metodo-pago.service';
import { CuentaPagarService } from '../../cuenta-pagar.service';
import { CuentaPagar } from '../../cuenta-pagar.types';
import { CuentaPagarDetalleComponent } from './cuenta-pagar-detalle.component';

describe('CuentaPagarDetalleComponent', () => {
  let fixture: ComponentFixture<CuentaPagarDetalleComponent>;
  let cuentaPagarService: { obtener: ReturnType<typeof vi.fn>; registrarPago: ReturnType<typeof vi.fn>; anular: ReturnType<typeof vi.fn> };
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function cuentaCon(overrides: Partial<CuentaPagar>): CuentaPagar {
    return {
      id: 5,
      compra_id: 42,
      proveedor: { id: 7, razon_social: 'Textiles del Norte' },
      monto_total: '1000.00',
      saldo_pendiente: '600.00',
      fecha_vencimiento: '2026-08-01',
      estado: 'pendiente',
      abonos: [],
      created_at: '2026-07-27T10:00:00Z',
      ...overrides,
    };
  }

  async function crearComponente(cuenta: CuentaPagar): Promise<void> {
    cuentaPagarService = {
      obtener: vi.fn().mockReturnValue(of(cuenta)),
      registrarPago: vi.fn(),
      anular: vi.fn(),
    };
    confirmDialog = { confirm: vi.fn().mockResolvedValue(true) };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CuentaPagarDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CuentaPagarService, useValue: cuentaPagarService },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentaPagarDetalleComponent);
    fixture.detectChanges();
  }

  it('pendiente sin abonos: puedePagar() y puedeAnular() son verdaderos', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente', abonos: [] }));

    expect(fixture.componentInstance['puedePagar']()).toBe(true);
    expect(fixture.componentInstance['puedeAnular']()).toBe(true);
  });

  it('pendiente con abonos: puedePagar() sigue verdadero pero puedeAnular() es falso (CuentasPagarService::anular exige sin abonos)', async () => {
    await crearComponente(
      cuentaCon({ estado: 'pendiente', abonos: [{ id: 1, monto: '400.00', metodo_pago: 'Efectivo', referencia: null, fecha: '2026-07-27T10:00:00Z' }] }),
    );

    expect(fixture.componentInstance['puedePagar']()).toBe(true);
    expect(fixture.componentInstance['puedeAnular']()).toBe(false);
  });

  it('pagada: puedePagar() y puedeAnular() son falsos', async () => {
    await crearComponente(cuentaCon({ estado: 'pagada', saldo_pendiente: '0.00' }));

    expect(fixture.componentInstance['puedePagar']()).toBe(false);
    expect(fixture.componentInstance['puedeAnular']()).toBe(false);
  });

  it('confirmarPago() llama a registrarPago() y recarga la cuenta', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente' }));
    cuentaPagarService.registrarPago.mockReturnValue(of({ saldoPendiente: '200.00', estado: 'pendiente' }));

    fixture.componentInstance.abrirPago();
    fixture.componentInstance['montoPago'].set(400);
    fixture.componentInstance['metodoPagoElegido'].set(1);
    fixture.componentInstance.confirmarPago();

    expect(cuentaPagarService.registrarPago).toHaveBeenCalledWith(5, { monto: 400, metodo_pago_id: 1, referencia: null });
    expect(toast.success).toHaveBeenCalledWith('Pago registrado.');
    expect(cuentaPagarService.obtener).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al recargar
  });

  it('confirmarPago() con error de negocio (ej. caja no abierta) muestra el mensaje real', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente' }));
    cuentaPagarService.registrarPago.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'No hay una caja abierta.', error_code: 'caja_sesion_no_abierta' } })),
    );

    fixture.componentInstance.abrirPago();
    fixture.componentInstance['montoPago'].set(400);
    fixture.componentInstance['metodoPagoElegido'].set(1);
    fixture.componentInstance.confirmarPago();

    expect(toast.error).toHaveBeenCalledWith('No hay una caja abierta.');
  });

  it('anular() pide confirmación antes de llamar al backend', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente', abonos: [] }));
    confirmDialog.confirm.mockResolvedValue(false);

    await fixture.componentInstance.anular();

    expect(cuentaPagarService.anular).not.toHaveBeenCalled();
  });

  it('anular() confirmado llama al backend y recarga la cuenta', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente', abonos: [] }));
    cuentaPagarService.anular.mockReturnValue(of(undefined));

    await fixture.componentInstance.anular();

    expect(cuentaPagarService.anular).toHaveBeenCalledWith(5);
    expect(toast.success).toHaveBeenCalledWith('Cuenta por pagar anulada.');
    expect(cuentaPagarService.obtener).toHaveBeenCalledTimes(2);
  });
});
