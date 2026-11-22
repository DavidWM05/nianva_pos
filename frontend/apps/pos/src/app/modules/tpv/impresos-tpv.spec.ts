import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NotaCreditoService } from '@nianva/domain-notas-credito';
import { CajaService, CuponValidacionService, GastoService, MetodoPagoService, Venta, VentaService } from '@nianva/domain-tpv';
import { AuditLogSource, ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
import { ImprimirDocumentoService } from '../../core/impresos/imprimir-documento.service';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ulidDePrueba } from '../../testing/ulid-de-prueba';
import { LineasPagoComponent } from './lineas-pago/lineas-pago.component';
import { CajaComponent } from './pages/caja/caja.component';
import { VentaDetalleComponent } from './pages/venta-detalle/venta-detalle.component';
import { VentaComponent } from './pages/venta/venta.component';

// Fase 4, B3 (UI-12): el TPV imprime desde la foto del documento: el ticket de la venta recien
// registrada y el de una venta ya registrada (o su version carta), y el corte de la caja recien
// cerrada. El ticket usa el ancho de papel de esta terminal. Sin impresos publicados en el
// servidor, no se ofrece imprimir.

/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

function impresionFalsa(disponible: boolean) {
  return { disponible, imprimiendo: signal(false), imprimir: vi.fn(() => of(undefined)) };
}

const boton = (raiz: HTMLElement, texto: string) =>
  [...raiz.querySelectorAll<HTMLButtonElement>('button')].find((elemento) => elemento.textContent?.trim().includes(texto));

const venta = {
  id: ulidDePrueba(42),
  numero: 42,
  folio: 'V-1-42',
  fecha: '2026-07-01T10:00:00Z',
  cliente: { id: ulidDePrueba(1), nombre: 'Ana Pérez' },
  total: '150.00',
  estado: 'completada',
  es_venta_sombra: false,
  metodos_pago: [],
  detalles: [],
} as unknown as Venta;

afterEach(() => localStorage.removeItem('nv-ancho-ticket'));

describe('VentaComponent: ticket de la venta recien registrada', () => {
  async function registrar(impresion: ReturnType<typeof impresionFalsa>) {
    await TestBed.configureTestingModule({
      imports: [VentaComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: ImprimirDocumentoService, useValue: impresion },
        { provide: CajaService, useValue: { actual: vi.fn().mockReturnValue(of({ sesion: { id: ulidDePrueba(1), estado: 'abierta' }, resumen: {}, permisos: {} })) } },
        { provide: VentaService, useValue: { cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })), registrar: vi.fn().mockReturnValue(of(venta)) } },
        { provide: NotaCreditoService, useValue: { activasPorCliente: vi.fn().mockReturnValue(of([])) } },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: CuponValidacionService, useValue: { validar: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        { provide: BUSCADOR_CLIENTE, useValue: { buscar: vi.fn().mockReturnValue(of([{ id: ulidDePrueba(9), nombre: 'Publico General' }])), obtener: vi.fn().mockReturnValue(of({ id: ulidDePrueba(9), nombre: 'Publico General' })) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(VentaComponent);
    fixture.detectChanges();
    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 1 }], subtotal: 150 });
    fixture.detectChanges();
    const lineasPago = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance as LineasPagoComponent;
    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 150);
    fixture.detectChanges();
    fixture.componentInstance.registrarVenta();
    fixture.detectChanges();
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  }

  it('la confirmacion muestra el folio y ofrece imprimir el ticket con el ancho de la terminal', async () => {
    // La terminal tiene impresora de 58 mm (PreferenciaTicketService lo lee al crearse).
    localStorage.setItem('nv-ancho-ticket', 'ticket-58');
    const impresion = impresionFalsa(true);
    const raiz = await registrar(impresion);

    expect(raiz.querySelector('h2')?.textContent?.trim()).toBe('Venta V-1-42 registrada');
    boton(raiz, 'Imprimir ticket')!.click();

    expect(impresion.imprimir).toHaveBeenCalledWith({ tipo: 'venta', venta: ulidDePrueba(42) }, 'ticket-58');
  });

  it('sin impresos publicados no ofrece imprimir', async () => {
    const raiz = await registrar(impresionFalsa(false));

    expect(raiz.querySelector('h2')?.textContent?.trim()).toBe('Venta V-1-42 registrada');
    expect(boton(raiz, 'Imprimir ticket')).toBeUndefined();
  });
});

describe('VentaDetalleComponent: reimpresion', () => {
  async function abrir(impresion: ReturnType<typeof impresionFalsa>) {
    await TestBed.configureTestingModule({
      imports: [VentaDetalleComponent],
      providers: [
        ...proveedoresDePantalla(),
        provideRouter([]),
        { provide: ImprimirDocumentoService, useValue: impresion },
        { provide: VentaService, useValue: { obtener: vi.fn().mockReturnValue(of(venta)) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: ulidDePrueba(42) }) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(VentaDetalleComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('el encabezado muestra el folio; imprime el ticket con el ancho de la terminal o la version carta', async () => {
    const impresion = impresionFalsa(true);
    const raiz = await abrir(impresion);

    expect(raiz.querySelector('h2')?.textContent?.trim()).toBe('Venta V-1-42');
    boton(raiz, 'Imprimir ticket')!.click();
    boton(raiz, 'Imprimir en carta')!.click();

    expect(impresion.imprimir.mock.calls).toEqual([
      [{ tipo: 'venta', venta: ulidDePrueba(42) }, 'ticket-80'],
      [{ tipo: 'venta', venta: ulidDePrueba(42) }, 'carta'],
    ]);
  });
});

describe('CajaComponent: corte de la caja recien cerrada', () => {
  it('ofrece imprimir el corte de la caja que se acaba de cerrar', async () => {
    const impresion = impresionFalsa(true);
    const sesion = { id: ulidDePrueba(3), estado: 'abierta', monto_apertura: '0.00', fecha_apertura: '2026-11-20T12:00:00Z' };
    const metodos = [{ metodo_pago_id: 1, nombre: 'Efectivo', total_teorico: '0.00' }];
    await TestBed.configureTestingModule({
      imports: [CajaComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: ImprimirDocumentoService, useValue: impresion },
        {
          provide: CajaService,
          useValue: {
            actual: () => of({ sesion, resumen: { ventas_count: 0, total_ventas: '0.00', total_gastos: '0.00', metodos }, permisos: { abrir: true, cerrar: true } }),
            cerrar: vi.fn(() => of({ sesion: { ...sesion, estado: 'cerrada', folio: 'C-1-3', diferencia: '0.00', metodos: [] }, desglose: { total_gastos: '0.00', total_abonos_cxc: '0.00', total_recargas_gc: '0.00', total_pagos_cxp: '0.00' } })),
          },
        },
        { provide: GastoService, useValue: { listar: () => of([]) } },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CajaComponent);
    fixture.detectChanges();
    const entrada = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#caja-conteo-1')!;
    entrada.value = '0';
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.componentInstance.cerrarCaja();
    fixture.detectChanges();

    boton(fixture.nativeElement as HTMLElement, 'Imprimir corte')!.click();

    expect(impresion.imprimir).toHaveBeenCalledWith({ tipo: 'corte', caja: ulidDePrueba(3) }, 'ticket-80');
  });
});
