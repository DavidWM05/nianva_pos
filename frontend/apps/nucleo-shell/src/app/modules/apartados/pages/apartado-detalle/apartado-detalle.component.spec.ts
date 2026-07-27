import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';

// jsdom (el entorno de estos tests) no implementa ResizeObserver -- lo usa
// PrimeNG's TabList (detras de RecordTabsComponent) en ngAfterViewInit.
// Mismo stub que cliente-detalle.component.spec.ts.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

import { LineasPagoComponent } from '../../../tpv/lineas-pago/lineas-pago.component';
import { MetodoPagoService } from '../../../tpv/metodo-pago.service';
import { ApartadoService } from '../../apartado.service';
import { Apartado, ApartadoDetallePermisos } from '../../apartado.types';
import { ApartadoDetalleComponent } from './apartado-detalle.component';

describe('ApartadoDetalleComponent', () => {
  let fixture: ComponentFixture<ApartadoDetalleComponent>;
  let apartadoService: {
    obtener: ReturnType<typeof vi.fn>;
    registrarAbono: ReturnType<typeof vi.fn>;
    liquidar: ReturnType<typeof vi.fn>;
    cancelar: ReturnType<typeof vi.fn>;
  };

  function apartadoBase(overrides: Partial<Apartado> = {}): Apartado {
    return {
      id: 7,
      fecha_creacion: '2026-07-01T10:00:00.000000Z',
      cliente: { id: 9, nombre: 'Maria Lopez' },
      total: '600.00',
      total_abonado: '480.00',
      estado: 'activo',
      fecha_vencimiento: '2026-08-01',
      fecha_completado: null,
      fecha_cancelado: null,
      motivo_cancelacion: null,
      venta_id: null,
      notas: null,
      detalles: [],
      abonos: [],
      ...overrides,
    };
  }

  async function crearComponente(
    apartado: Apartado,
    permisos: ApartadoDetallePermisos = { abonar: true, cancelar: true },
  ): Promise<void> {
    apartadoService = {
      obtener: vi.fn().mockReturnValue(of({ apartado, permisos })),
      registrarAbono: vi.fn(),
      liquidar: vi.fn(),
      cancelar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ApartadoDetalleComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: ApartadoService, useValue: apartadoService },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(apartado.id) }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApartadoDetalleComponent);
    fixture.detectChanges();
  }

  it('liquidar esta deshabilitado si el saldo no esta cubierto', async () => {
    await crearComponente(apartadoBase({ total: '600.00', total_abonado: '480.00' }));

    expect(fixture.componentInstance['puedeLiquidar']()).toBe(false);
    expect(fixture.componentInstance['saldoPendiente']()).toBe(120);
  });

  it('liquidar esta habilitado cuando el saldo ya esta cubierto', async () => {
    await crearComponente(apartadoBase({ total: '600.00', total_abonado: '600.00' }));

    expect(fixture.componentInstance['puedeLiquidar']()).toBe(true);

    apartadoService.liquidar.mockReturnValue(of(apartadoBase({ estado: 'completado', total_abonado: '600.00' })));
    fixture.componentInstance.liquidar();

    expect(apartadoService.liquidar).toHaveBeenCalledWith(7);
  });

  it('registra un abono con pago mixto que cuadra con el monto capturado', async () => {
    await crearComponente(apartadoBase());
    apartadoService.registrarAbono.mockReturnValue(of(apartadoBase({ total_abonado: '600.00' })));

    fixture.componentInstance['montoAbono'].set(120);
    fixture.detectChanges();

    const lineasPago: LineasPagoComponent = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance;
    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 120);
    fixture.detectChanges();

    expect(fixture.componentInstance['pagoAbonoCuadra']()).toBe(true);

    fixture.componentInstance.registrarAbono();

    expect(apartadoService.registrarAbono).toHaveBeenCalledWith(7, {
      monto: 120,
      pagos: [{ metodo_pago_id: 1, monto: 120 }],
    });
  });

  it('cancelar muestra los abonos pendientes que devuelve el backend', async () => {
    await crearComponente(apartadoBase());
    apartadoService.cancelar.mockReturnValue(
      of({
        apartado: apartadoBase({ estado: 'cancelado', motivo_cancelacion: 'Cliente se arrepintio' }),
        tieneAbonosPendientes: true,
        montoAbonadoPendiente: 480,
      }),
    );

    fixture.componentInstance.abrirCancelacion();
    fixture.componentInstance['motivoCancelacion'].set('Cliente se arrepintio');
    fixture.componentInstance.confirmarCancelacion();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('480');
    expect(fixture.componentInstance['resultadoCancelacion']()?.tieneAbonosPendientes).toBe(true);
  });

  it('oculta "Cancelar apartado" sin el permiso apartados.cancelar', async () => {
    await crearComponente(apartadoBase(), { abonar: true, cancelar: false });

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Cancelar apartado');
  });
});
