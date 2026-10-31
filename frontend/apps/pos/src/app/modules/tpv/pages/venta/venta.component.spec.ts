import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { NotaCreditoService } from '../../../notas-credito/nota-credito.service';
import { NotaCredito } from '../../../notas-credito/nota-credito.types';
import { CajaService } from '../../caja.service';
import { CajaActual } from '../../caja.types';
import { CuponValidacionService } from '../../cupon-validacion.service';
import { LineasPagoComponent } from '../../lineas-pago/lineas-pago.component';
import { LineasProductoComponent } from '../../lineas-producto/lineas-producto.component';
import { MetodoPagoService } from '../../metodo-pago.service';
import { VentaService } from '../../venta.service';
import { VentaComponent } from './venta.component';

describe('VentaComponent', () => {
  let fixture: ComponentFixture<VentaComponent>;
  let ventaService: { cotizar: ReturnType<typeof vi.fn>; registrar: ReturnType<typeof vi.fn> };
  let notaCreditoService: { activasPorCliente: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

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
    notaCreditoService = { activasPorCliente: vi.fn().mockReturnValue(of([])) };
    toastService = { success: vi.fn(), error: vi.fn(), warn: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [VentaComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CajaService, useValue: { actual: vi.fn().mockReturnValue(of(estadoCaja)) } },
        { provide: VentaService, useValue: ventaService },
        { provide: NotaCreditoService, useValue: notaCreditoService },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }, { id: 2, nombre: 'Tarjeta', tipo: 'tarjeta' }])) } },
        { provide: CuponValidacionService, useValue: { validar: vi.fn() } },
        { provide: ToastService, useValue: toastService },
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

  it('pago que cuadra pero sin cliente seleccionado: puedeRegistrar() sigue en false (bug corregido, antes el boton quedaba habilitado igual)', async () => {
    await crearComponente();

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.componentInstance['clienteId'].set(null);
    fixture.detectChanges();

    const { By } = await import('@angular/platform-browser');
    const lineasPago: LineasPagoComponent = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance;
    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 200);
    fixture.detectChanges();

    expect(fixture.componentInstance['pagoCuadra']()).toBe(true);
    expect(fixture.componentInstance['puedeRegistrar']()).toBe(false);
    expect(fixture.componentInstance['mensajeBloqueo']()).toBe('Selecciona un cliente para continuar.');
  });

  it('F2 enfoca el buscador de producto (delega en LineasProductoComponent.focusBuscador)', async () => {
    await crearComponente();

    const { By } = await import('@angular/platform-browser');
    const lineasProducto: LineasProductoComponent = fixture.debugElement.query(By.directive(LineasProductoComponent))
      .componentInstance;
    const focusSpy = vi.spyOn(lineasProducto, 'focusBuscador');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));

    expect(focusSpy).toHaveBeenCalled();
  });

  it('ESC cancela la linea en curso (delega en LineasProductoComponent.cancelarLineaEnCurso)', async () => {
    await crearComponente();

    const { By } = await import('@angular/platform-browser');
    const lineasProducto: LineasProductoComponent = fixture.debugElement.query(By.directive(LineasProductoComponent))
      .componentInstance;
    const cancelSpy = vi.spyOn(lineasProducto, 'cancelarLineaEnCurso');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('F9 registra la venta cuando puedeRegistrar() es verdadero', async () => {
    await crearComponente();
    ventaService.registrar.mockReturnValue(of({ id: 1, total: 200 }));

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.detectChanges();

    const { By } = await import('@angular/platform-browser');
    const lineasPago: LineasPagoComponent = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance;
    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 200);
    fixture.detectChanges();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }));

    expect(ventaService.registrar).toHaveBeenCalled();
  });

  it('F4 no registra en silencio si falta algo -- avisa con un toast explicando que falta', async () => {
    await crearComponente();
    fixture.componentInstance['clienteId'].set(null);
    fixture.detectChanges();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4' }));

    expect(ventaService.registrar).not.toHaveBeenCalled();
    expect(toastService.warn).toHaveBeenCalledWith('Agrega al menos un producto al carrito.');
  });

  it('seleccionar cliente pide sus notas de credito activas', async () => {
    await crearComponente();

    fixture.componentInstance.onClienteSeleccionado(9);

    expect(notaCreditoService.activasPorCliente).toHaveBeenCalledWith(9);
  });

  it('con nota de credito seleccionada, montoObjetivoPago se reduce por el saldo disponible de la nota (topado al total)', async () => {
    const notas: NotaCredito[] = [
      {
        id: 3,
        cliente: { id: 9, nombre: 'Juan' },
        devolucion_id: 1,
        monto_original: '500.00',
        saldo_disponible: '80.00',
        fecha_expiracion: null,
        estado: 'activa',
        created_at: '2026-07-01T00:00:00Z',
      },
    ];
    await crearComponente();
    // notaCreditoService se reasigna dentro de crearComponente() -- el mock
    // hay que configurarlo DESPUES, sobre la instancia que realmente quedo
    // inyectada (la de antes se descarta).
    notaCreditoService.activasPorCliente.mockReturnValue(of(notas));

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.componentInstance.onClienteSeleccionado(9);
    fixture.componentInstance['notaCreditoSeleccionadaId'].set(3);
    fixture.detectChanges();

    expect(fixture.componentInstance['montoNotaCredito']()).toBe(80);
    expect(fixture.componentInstance['montoObjetivoPago']()).toBe(120);
  });

  it('con codigo de gift card y un monto estimado, montoObjetivoPago se reduce por esa estimacion', async () => {
    await crearComponente();

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.componentInstance['giftCardCodigo'].set('GC-1-ABCD1234');
    fixture.componentInstance['giftCardMontoEstimado'].set(50);
    fixture.detectChanges();

    expect(fixture.componentInstance['montoObjetivoPago']()).toBe(150);
  });

  it('registrarVenta() manda gift_card_codigo y nota_credito_id en el payload', async () => {
    const notas: NotaCredito[] = [
      {
        id: 3,
        cliente: { id: 9, nombre: 'Juan' },
        devolucion_id: 1,
        monto_original: '500.00',
        saldo_disponible: '200.00',
        fecha_expiracion: null,
        estado: 'activa',
        created_at: '2026-07-01T00:00:00Z',
      },
    ];
    await crearComponente();
    notaCreditoService.activasPorCliente.mockReturnValue(of(notas));
    ventaService.registrar.mockReturnValue(of({ id: 1, total: 200 }));

    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    // detectChanges intermedio: LineasPagoComponent solo dispara ngOnChanges
    // (y por lo tanto reemite `cambio`) cuando [montoObjetivo] cambia de UN
    // detectChanges al siguiente -- si se agrupan todos los cambios en una
    // sola pasada, el binding pasa de 0 (inicial) a 0 (final, cubierto por
    // la nota de credito) sin que Angular detecte una diferencia en medio.
    fixture.detectChanges();

    fixture.componentInstance.onClienteSeleccionado(9);
    fixture.componentInstance['notaCreditoSeleccionadaId'].set(3);
    fixture.componentInstance['giftCardCodigo'].set('GC-1-ABCD1234');
    fixture.detectChanges();

    // notaCredito cubre 200 (min(200, 200)), monto objetivo de pagos tradicionales queda en 0
    fixture.componentInstance.registrarVenta();

    expect(ventaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ gift_card_codigo: 'GC-1-ABCD1234', nota_credito_id: 3 }),
    );
  });

  it('los atajos de teclado no hacen nada mientras no hay caja abierta', async () => {
    await crearComponente({
      sesion: null,
      resumen: null,
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9' }));

    expect(ventaService.registrar).not.toHaveBeenCalled();
    expect(toastService.warn).not.toHaveBeenCalled();
  });
});
