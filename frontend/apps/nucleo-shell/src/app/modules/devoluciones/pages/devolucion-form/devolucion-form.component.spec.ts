import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { MetodoPagoService } from '../../../tpv/metodo-pago.service';
import { Venta } from '../../../tpv/venta.types';
import { VentaService } from '../../../tpv/venta.service';
import { DevolucionService } from '../../devolucion.service';
import { DevolucionFormComponent } from './devolucion-form.component';

describe('DevolucionFormComponent', () => {
  let fixture: ComponentFixture<DevolucionFormComponent>;
  let ventaService: { obtener: ReturnType<typeof vi.fn>; cotizar: ReturnType<typeof vi.fn> };
  let devolucionService: { registrar: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const ventaOrigen: Venta = {
    id: 55,
    fecha: '2026-07-01T10:00:00.000000Z',
    cliente: { id: 9, nombre: 'Publico General' },
    total: '300.00',
    descuento_cupon: '0.00',
    descuento_manual: '0.00',
    abono_previo: '0.00',
    estado: 'completada',
    motivo_anulacion: null,
    fecha_anulacion: null,
    es_venta_sombra: false,
    detalles: [
      {
        id: 1,
        variante_id: 5,
        variante: { id: 5, talla: 'M', color: null, producto_nombre: 'Camisa' },
        cantidad: 2,
        precio_unitario: '120.00',
        descuento_aplicado: '0.00',
        subtotal: '240.00',
      },
      {
        id: 2,
        variante_id: 6,
        variante: { id: 6, talla: 'Unica', color: null, producto_nombre: 'Corbata' },
        cantidad: 1,
        precio_unitario: '60.00',
        descuento_aplicado: '0.00',
        subtotal: '60.00',
      },
    ],
  };

  async function crearComponente(ventaIdQueryParam: string | null = '55'): Promise<void> {
    ventaService = {
      obtener: vi.fn().mockReturnValue(of(ventaOrigen)),
      cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })),
    };
    devolucionService = { registrar: vi.fn() };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DevolucionFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: VentaService, useValue: ventaService },
        { provide: DevolucionService, useValue: devolucionService },
        { provide: ToastService, useValue: toastService },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(ventaIdQueryParam ? { venta_id: ventaIdQueryParam } : {}) },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DevolucionFormComponent);
    fixture.detectChanges();
  }

  it('con ?venta_id= en la URL, busca la venta automaticamente y precarga sus lineas', async () => {
    await crearComponente('55');

    expect(ventaService.obtener).toHaveBeenCalledWith(55);
    expect(fixture.componentInstance['lineasDevueltas']()).toHaveLength(2);
  });

  it('calcula la diferencia en vivo al marcar cantidad a devolver', async () => {
    await crearComponente();

    fixture.componentInstance.actualizarCantidadDevuelta(0, 1);

    expect(fixture.componentInstance['montoDevolucionEstimado']()).toBe(120);
    // tipo='devolucion' -> montoCambio=0, diferencia = 0 - 120 = -120 (reembolso).
    expect(fixture.componentInstance['diferenciaEstimada']()).toBe(-120);
  });

  it('una linea marcada "va a merma" no cuenta para el total que regresa a stock', async () => {
    await crearComponente();

    fixture.componentInstance.actualizarCantidadDevuelta(0, 1);
    fixture.componentInstance.actualizarMerma(0, true);
    fixture.componentInstance.actualizarCantidadDevuelta(1, 1);

    expect(fixture.componentInstance['unidadesRegresanAStock']()).toBe(1);
    expect(fixture.componentInstance['unidadesMerma']()).toBe(1);
  });

  it('en tipo "cambio", agregar lineas nuevas actualiza el monto del cambio y la diferencia', async () => {
    await crearComponente();

    fixture.componentInstance.cambiarTipo('cambio');
    fixture.componentInstance.actualizarCantidadDevuelta(0, 1);
    fixture.componentInstance.onLineasNuevasCambio({ items: [{ variante_id: 7, cantidad: 1 }], subtotal: 400 });

    expect(fixture.componentInstance['itemsNuevosActuales']()).toEqual([{ variante_id: 7, cantidad: 1 }]);
    expect(fixture.componentInstance['montoCambio']()).toBe(400);
    // 400 (cambio) - 120 (devuelto) = 280 (cobro adicional).
    expect(fixture.componentInstance['diferenciaEstimada']()).toBe(280);
  });

  it('rechaza proactivamente tipo="devolucion" sobre una venta sombra', async () => {
    await crearComponente();
    ventaService.obtener.mockReturnValue(of({ ...ventaOrigen, es_venta_sombra: true }));
    fixture.componentInstance.buscarVenta();
    fixture.componentInstance.actualizarCantidadDevuelta(0, 1);

    expect(fixture.componentInstance['rechazoPorVentaSombra']()).toBe(true);
    expect(fixture.componentInstance['puedeRegistrar']()).toBe(false);
  });
});
