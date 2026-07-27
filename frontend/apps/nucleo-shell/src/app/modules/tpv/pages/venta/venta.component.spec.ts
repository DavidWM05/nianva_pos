import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { CajaService } from '../../caja.service';
import { CajaActual } from '../../caja.types';
import { CuponValidacionService } from '../../cupon-validacion.service';
import { LineasPagoComponent } from '../../lineas-pago/lineas-pago.component';
import { MetodoPagoService } from '../../metodo-pago.service';
import { VentaService } from '../../venta.service';
import { VentaComponent } from './venta.component';

describe('VentaComponent', () => {
  let fixture: ComponentFixture<VentaComponent>;
  let ventaService: { cotizar: ReturnType<typeof vi.fn>; registrar: ReturnType<typeof vi.fn> };

  const cajaAbierta: CajaActual = {
    sesion: {
      id: 1,
      sucursal_id: 1,
      usuario_id: 1,
      monto_apertura: '500.00',
      monto_cierre: null,
      total_ventas_sistema: null,
      diferencia: null,
      fecha_apertura: '2026-07-22T10:00:00.000000Z',
      fecha_cierre: null,
      estado: 'abierta',
    },
    resumen: { ventas_count: 0, total_ventas: 0, total_gastos: 0 },
    permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
  };

  async function crearComponente(estadoCaja: CajaActual = cajaAbierta): Promise<void> {
    ventaService = {
      cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })),
      registrar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VentaComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CajaService, useValue: { actual: vi.fn().mockReturnValue(of(estadoCaja)) } },
        { provide: VentaService, useValue: ventaService },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }, { id: 2, nombre: 'Tarjeta', tipo: 'tarjeta' }])) } },
        { provide: CuponValidacionService, useValue: { validar: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        {
          provide: BUSCADOR_CLIENTE,
          useValue: {
            buscar: vi.fn().mockReturnValue(of([{ id: 9, nombre: 'Publico General' }])),
            obtener: vi.fn().mockReturnValue(of({ id: 9, nombre: 'Publico General' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VentaComponent);
    fixture.detectChanges();
  }

  it('sin caja abierta, bloquea la captura y no muestra el formulario de venta', async () => {
    await crearComponente({
      sesion: null,
      resumen: null,
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No se puede vender todavía');
    expect(fixture.nativeElement.querySelector('nucleo-lineas-producto')).toBeNull();
  });

  it('recibe las lineas resueltas del carrito (nucleo-lineas-producto) y las refleja en el subtotal', async () => {
    await crearComponente();

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.detectChanges();

    expect(fixture.componentInstance['itemsActuales']()).toEqual([{ variante_id: 5, cantidad: 2 }]);
    expect(fixture.componentInstance['subtotal']()).toBe(200);
    expect(fixture.componentInstance['total']()).toBe(200);
  });

  it('un pago mixto que cuadra (segun el nucleo-lineas-pago real) habilita "Registrar venta"', async () => {
    await crearComponente();

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.detectChanges();

    const { By } = await import('@angular/platform-browser');
    const lineasPago: LineasPagoComponent = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance;

    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 120);
    lineasPago.agregarLineaPago();
    lineasPago.actualizarMetodoPago(1, 2);
    lineasPago.actualizarMontoPago(1, 80);
    fixture.detectChanges();

    expect(fixture.componentInstance['pagoCuadra']()).toBe(true);
  });

  it('un pago que no cuadra mantiene "Registrar venta" deshabilitado', async () => {
    await crearComponente();

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.detectChanges();

    const { By } = await import('@angular/platform-browser');
    const lineasPago: LineasPagoComponent = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance;

    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 50);
    fixture.detectChanges();

    expect(fixture.componentInstance['pagoCuadra']()).toBe(false);
  });

  it('sin lineas en el carrito, "Registrar venta" queda deshabilitado aunque los pagos cuadren con 0', async () => {
    await crearComponente();
    fixture.detectChanges();

    expect(fixture.componentInstance['itemsActuales']()).toEqual([]);
    expect(fixture.componentInstance['pagoCuadra']()).toBe(false);
  });
});
