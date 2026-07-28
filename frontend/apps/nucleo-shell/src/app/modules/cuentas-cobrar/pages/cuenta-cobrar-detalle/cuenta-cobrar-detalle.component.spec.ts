import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ConfirmDialogService, ToastService } from '@nucleo/ui-shared';
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
import { CuentaCobrarService } from '../../cuenta-cobrar.service';
import { CuentaCobrar } from '../../cuenta-cobrar.types';
import { CuentaCobrarDetalleComponent } from './cuenta-cobrar-detalle.component';

describe('CuentaCobrarDetalleComponent', () => {
  let fixture: ComponentFixture<CuentaCobrarDetalleComponent>;
  let cuentaCobrarService: { obtener: ReturnType<typeof vi.fn>; registrarAbono: ReturnType<typeof vi.fn>; anular: ReturnType<typeof vi.fn> };
  let confirmDialog: { confirm: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function cuentaCon(overrides: Partial<CuentaCobrar>): CuentaCobrar {
    return {
      id: 5,
      venta_id: 42,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      monto_total: '500.00',
      saldo_pendiente: '300.00',
      fecha_vencimiento: '2026-08-01',
      estado: 'pendiente',
      dias_vencida: 0,
      abonos: [],
      created_at: '2026-07-27T10:00:00Z',
      ...overrides,
    };
  }

  async function crearComponente(cuenta: CuentaCobrar): Promise<void> {
    cuentaCobrarService = {
      obtener: vi.fn().mockReturnValue(of(cuenta)),
      registrarAbono: vi.fn(),
      anular: vi.fn(),
    };
    confirmDialog = { confirm: vi.fn().mockResolvedValue(true) };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CuentaCobrarDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CuentaCobrarService, useValue: cuentaCobrarService },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CuentaCobrarDetalleComponent);
    fixture.detectChanges();
  }

  it('pendiente sin abonos: puedeAbonar() y puedeAnular() son verdaderos', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente', abonos: [] }));

    expect(fixture.componentInstance['puedeAbonar']()).toBe(true);
    expect(fixture.componentInstance['puedeAnular']()).toBe(true);
  });

  it('pendiente con abonos: puedeAbonar() sigue verdadero pero puedeAnular() es falso (CuentasCobrarService::anular exige sin abonos)', async () => {
    await crearComponente(
      cuentaCon({ estado: 'pendiente', abonos: [{ id: 1, monto: '100.00', metodo_pago: 'Efectivo', referencia: null, fecha: '2026-07-27T10:00:00Z' }] }),
    );

    expect(fixture.componentInstance['puedeAbonar']()).toBe(true);
    expect(fixture.componentInstance['puedeAnular']()).toBe(false);
  });

  it('pagada: puedeAbonar() y puedeAnular() son falsos', async () => {
    await crearComponente(cuentaCon({ estado: 'pagada', saldo_pendiente: '0.00' }));

    expect(fixture.componentInstance['puedeAbonar']()).toBe(false);
    expect(fixture.componentInstance['puedeAnular']()).toBe(false);
  });

  it('confirmarAbono() llama a registrarAbono() y recarga la cuenta', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente' }));
    cuentaCobrarService.registrarAbono.mockReturnValue(of({ saldoPendiente: '100.00', estado: 'pendiente' }));

    fixture.componentInstance.abrirAbono();
    fixture.componentInstance['montoAbono'].set(200);
    fixture.componentInstance['metodoPagoElegido'].set(1);
    fixture.componentInstance.confirmarAbono();

    expect(cuentaCobrarService.registrarAbono).toHaveBeenCalledWith(5, { monto: 200, metodo_pago_id: 1, referencia: null });
    expect(toast.success).toHaveBeenCalledWith('Abono registrado.');
    expect(cuentaCobrarService.obtener).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al recargar
  });

  it('confirmarAbono() con error de negocio (ej. caja no abierta) muestra el mensaje real', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente' }));
    cuentaCobrarService.registrarAbono.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'No hay una caja abierta.', error_code: 'caja_sesion_no_abierta' } })),
    );

    fixture.componentInstance.abrirAbono();
    fixture.componentInstance['montoAbono'].set(200);
    fixture.componentInstance['metodoPagoElegido'].set(1);
    fixture.componentInstance.confirmarAbono();

    expect(toast.error).toHaveBeenCalledWith('No hay una caja abierta.');
  });

  it('anular() pide confirmación antes de llamar al backend', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente', abonos: [] }));
    confirmDialog.confirm.mockResolvedValue(false);

    await fixture.componentInstance.anular();

    expect(cuentaCobrarService.anular).not.toHaveBeenCalled();
  });

  it('anular() confirmado llama al backend y recarga la cuenta', async () => {
    await crearComponente(cuentaCon({ estado: 'pendiente', abonos: [] }));
    cuentaCobrarService.anular.mockReturnValue(of(undefined));

    await fixture.componentInstance.anular();

    expect(cuentaCobrarService.anular).toHaveBeenCalledWith(5);
    expect(toast.success).toHaveBeenCalledWith('Cuenta por cobrar anulada.');
    expect(cuentaCobrarService.obtener).toHaveBeenCalledTimes(2);
  });
});
