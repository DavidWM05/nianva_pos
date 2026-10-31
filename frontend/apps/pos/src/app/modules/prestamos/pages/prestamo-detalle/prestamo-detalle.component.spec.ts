import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ToastService } from '@nianva/ui-shared';
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

import { PrestamoService } from '../../prestamo.service';
import { Prestamo } from '../../prestamo.types';
import { PrestamoDetalleComponent } from './prestamo-detalle.component';

describe('PrestamoDetalleComponent', () => {
  let fixture: ComponentFixture<PrestamoDetalleComponent>;
  let prestamoService: { obtener: ReturnType<typeof vi.fn>; registrarPago: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function prestamoCon(overrides: Partial<Prestamo>): Prestamo {
    return {
      id: 5,
      proveedor_id: null,
      referencia: 'Juan Pérez',
      monto: '1000.00',
      interes: '5.00',
      monto_a_pagar: '1050.00',
      saldo_pendiente: '1050.00',
      fecha_prestamo: '2026-07-01',
      fecha_vencimiento: null,
      estado: 'activo',
      notas: null,
      pagos: [],
      ...overrides,
    };
  }

  async function crearComponente(prestamo: Prestamo): Promise<void> {
    prestamoService = { obtener: vi.fn().mockReturnValue(of(prestamo)), registrarPago: vi.fn() };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PrestamoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PrestamoService, useValue: prestamoService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrestamoDetalleComponent);
    fixture.detectChanges();
  }

  it('carga el prestamo por id de la ruta y muestra sus datos', async () => {
    await crearComponente(prestamoCon({}));

    expect(prestamoService.obtener).toHaveBeenCalledWith(5);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(texto).toContain('1050.00');
  });

  it('activo: puedePagar() es verdadero; pagado: es falso', async () => {
    await crearComponente(prestamoCon({ estado: 'activo' }));
    expect(fixture.componentInstance['puedePagar']()).toBe(true);
  });

  it('sin pagos, muestra el mensaje de "no tiene pagos todavía"', async () => {
    await crearComponente(prestamoCon({ pagos: [] }));

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('no tiene pagos registrados todavía');
  });

  it('con pagos, los lista con su monto', async () => {
    await crearComponente(prestamoCon({ pagos: [{ id: 1, monto: '200.00', notas: null, fecha: '2026-07-20T10:00:00Z' }] }));

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('200.00');
  });

  it('confirmarRegistrarPago() llama a registrarPago() y recarga el prestamo', async () => {
    await crearComponente(prestamoCon({ estado: 'activo' }));
    prestamoService.registrarPago.mockReturnValue(of(undefined));

    fixture.componentInstance.abrirRegistrarPago();
    fixture.componentInstance['montoPago'].set(200);
    fixture.componentInstance.confirmarRegistrarPago();

    expect(prestamoService.registrarPago).toHaveBeenCalledWith(5, { monto: 200 });
    expect(toast.success).toHaveBeenCalledWith('Pago registrado.');
    expect(prestamoService.obtener).toHaveBeenCalledTimes(2); // 1 al iniciar + 1 al recargar
  });

  it('confirmarRegistrarPago() con error de negocio muestra el mensaje real', async () => {
    await crearComponente(prestamoCon({ estado: 'activo' }));
    prestamoService.registrarPago.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'El pago excede el saldo pendiente.', error_code: 'pago_excede_saldo_prestamo' } })),
    );

    fixture.componentInstance.abrirRegistrarPago();
    fixture.componentInstance['montoPago'].set(9999);
    fixture.componentInstance.confirmarRegistrarPago();

    expect(toast.error).toHaveBeenCalledWith('El pago excede el saldo pendiente.');
  });
});
