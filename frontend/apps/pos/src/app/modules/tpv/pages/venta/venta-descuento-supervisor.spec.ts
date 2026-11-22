import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { NotaCreditoService } from '@nianva/domain-notas-credito';
import { CajaActual, CajaService, CuponValidacionService, MetodoPagoService, VentaService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { LineasPagoComponent } from '../../lineas-pago/lineas-pago.component';
import { VentaComponent } from './venta.component';

// Fase 4, B2 (SEG-05, API-07): descuento manual en importe, de 0 al subtotal. Arriba del margen,
// el servidor responde supervisor_requerido; la venta pide el PIN y reintenta el mismo cuerpo con
// la misma Idempotency-Key y el token. Si el cajero cambia el carrito o el descuento antes de
// reintentar, el token se descarta y la llave es nueva.

type Llamada = { payload: Record<string, unknown>; llave: string | undefined; token: string | undefined };

function rechazo(codigo: string, status = 403): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { error_code: codigo, message: 'rechazo' } });
}

describe('VentaComponent (descuento y supervisor)', () => {
  let fixture: ComponentFixture<VentaComponent>;
  let llamadas: Llamada[];
  let respuestas: (() => Observable<unknown>)[];

  const cajaAbierta: CajaActual = {
    sesion: {
      id: ulidDePrueba(1),
      folio: 'C-1-1',
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
    resumen: { ventas_count: 0, total_ventas: '0.00', total_gastos: '0.00' },
    permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
  };

  async function crearComponente(): Promise<void> {
    llamadas = [];
    respuestas = [];
    const registrar = vi.fn((payload: Record<string, unknown>, llave?: string, token?: string) => {
      llamadas.push({ payload, llave, token });
      return (respuestas.shift() ?? (() => of({ id: ulidDePrueba(7), folio: 'V-1-7', total: 190 })))();
    });

    await TestBed.configureTestingModule({
      imports: [VentaComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: CajaService, useValue: { actual: vi.fn().mockReturnValue(of(cajaAbierta)) } },
        { provide: VentaService, useValue: { cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })), registrar } },
        { provide: NotaCreditoService, useValue: { activasPorCliente: vi.fn().mockReturnValue(of([])) } },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: CuponValidacionService, useValue: { validar: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        {
          provide: BUSCADOR_CLIENTE,
          useValue: {
            buscar: vi.fn().mockReturnValue(of([{ id: ulidDePrueba(9), nombre: 'Publico General' }])),
            obtener: vi.fn().mockReturnValue(of({ id: ulidDePrueba(9), nombre: 'Publico General' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VentaComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  }

  afterEach(() => {
    (fixture?.nativeElement as HTMLElement | undefined)?.remove();
    vi.restoreAllMocks();
  });

  const venta = () => fixture.componentInstance as unknown as {
    descuentoManual: { set(valor: number | null): void };
    total(): number;
    puedeRegistrar(): boolean;
    mensajeBloqueo(): string | null;
    registrando(): boolean;
    registrarVenta(): void;
  };
  const supervisor = () => TestBed.inject(AutorizacionSupervisorService);

  /** Carrito de 200 con el descuento dado y el pago que cuadra con el total. */
  function capturar(descuento: number | null): void {
    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    venta().descuentoManual.set(descuento);
    fixture.detectChanges();
    const lineasPago = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance as LineasPagoComponent;
    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, venta().total());
    fixture.detectChanges();
  }

  async function registrar(): Promise<void> {
    venta().registrarVenta();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('el campo Descuento esta en los totales y resta del total', async () => {
    await crearComponente();

    capturar(10);

    expect((fixture.nativeElement as HTMLElement).querySelector('.venta__totales')?.textContent).toContain('Descuento');
    expect(venta().total()).toBe(190);
  });

  it('un descuento arriba del subtotal no deja cobrar y lo dice', async () => {
    await crearComponente();

    capturar(250);

    expect(venta().puedeRegistrar()).toBe(false);
    expect(venta().mensajeBloqueo()).toBe('El descuento debe estar entre $0 y el subtotal.');
  });

  it('sin supervisor: una sola llamada con el descuento y una llave, sin token ni dialogo', async () => {
    await crearComponente();
    capturar(10);

    await registrar();

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].payload).toMatchObject({ descuento_manual: 10 });
    expect(llamadas[0].llave).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(llamadas[0].token).toBeUndefined();
    expect(supervisor().pendiente()).toBeNull();
  });

  it('con supervisor: pide la autorizacion de ventas.descuento y reintenta el mismo cuerpo con la misma llave y el token', async () => {
    await crearComponente();
    respuestas.push(() => throwError(() => rechazo('supervisor_requerido')));
    capturar(60);

    await registrar();
    const peticion = supervisor().pendiente();
    expect(peticion?.solicitud).toMatchObject({ accion: 'ventas.descuento', datos: llamadas[0].payload });
    expect(peticion?.solicitud.recurso).toBeUndefined();
    peticion?.resolver('token-1');
    await fixture.whenStable();

    expect(llamadas).toHaveLength(2);
    expect(llamadas[1]).toEqual({ payload: llamadas[0].payload, llave: llamadas[0].llave, token: 'token-1' });
    expect(venta().registrando()).toBe(false);
  });

  it('si el cajero cambia el descuento antes de reintentar, la llave es nueva y el token se descarta', async () => {
    await crearComponente();
    respuestas.push(
      () => throwError(() => rechazo('supervisor_requerido')),
      () => throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    capturar(60);
    await registrar();
    supervisor().pendiente()?.resolver('token-1');
    await fixture.whenStable();

    capturar(40);
    await registrar();

    expect(llamadas[1]).toMatchObject({ llave: llamadas[0].llave, token: 'token-1' });
    expect(llamadas[2].payload).toMatchObject({ descuento_manual: 40 });
    expect(llamadas[2].llave).not.toBe(llamadas[0].llave);
    expect(llamadas[2].token).toBeUndefined();
  });

  it('si el cajero cancela el dialogo, el boton se libera y no se reintenta', async () => {
    await crearComponente();
    respuestas.push(() => throwError(() => rechazo('supervisor_requerido')));
    capturar(60);

    await registrar();
    supervisor().pendiente()?.resolver(null);
    await fixture.whenStable();

    expect(llamadas).toHaveLength(1);
    expect(venta().registrando()).toBe(false);
  });
});
