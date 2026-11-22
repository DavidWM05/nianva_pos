import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { NotaCreditoService } from '@nianva/domain-notas-credito';
import { CajaActual, CajaService, CuponValidacionService, MetodoPagoService, VentaService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CLIENTE, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { LineasPagoComponent } from '../../lineas-pago/lineas-pago.component';
import { LineasProductoComponent } from '../../lineas-producto/lineas-producto.component';
import { VentaComponent } from './venta.component';

// Fase 4, B1 (UI-17): la venta se opera completa con teclado. Los atajos no le ganan a un overlay
// abierto, el foco no se pierde al cambiar de estado y lo que bloquea el cobro se anuncia.
describe('VentaComponent (teclado y foco)', () => {
  let fixture: ComponentFixture<VentaComponent>;
  let ventaService: { cotizar: ReturnType<typeof vi.fn>; registrar: ReturnType<typeof vi.fn> };

  const cajaAbierta: CajaActual = {
    sesion: {
      id: ulidDePrueba(1),
      numero: 1,
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
    ventaService = {
      cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })),
      registrar: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [VentaComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: CajaService, useValue: { actual: vi.fn().mockReturnValue(of(cajaAbierta)) } },
        { provide: VentaService, useValue: ventaService },
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

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const lineasProducto = (): LineasProductoComponent =>
    fixture.debugElement.query(By.directive(LineasProductoComponent)).componentInstance as LineasProductoComponent;

  async function registrarVentaDeEjemplo(): Promise<void> {
    ventaService.registrar.mockReturnValue(of({ id: ulidDePrueba(7), numero: 7, folio: 'V-1-7', total: 200 }));
    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
    fixture.detectChanges();
    const lineasPago = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance as LineasPagoComponent;
    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 200);
    fixture.detectChanges();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4' }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Esc que ya atendio un overlay abierto (lista de variantes, sugerencias) no cancela la linea en curso', async () => {
    await crearComponente();
    const cancelar = vi.spyOn(lineasProducto(), 'cancelarLineaEnCurso');
    // Como el overlay de Material: atiende el Escape en el documento y lo marca como atendido.
    const overlay = (evento: KeyboardEvent): void => evento.preventDefault();
    document.body.addEventListener('keydown', overlay);

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    document.body.removeEventListener('keydown', overlay);

    expect(cancelar).not.toHaveBeenCalled();
  });

  it('al registrar, el foco pasa al encabezado de la confirmacion', async () => {
    await crearComponente();

    await registrarVentaDeEjemplo();

    const encabezado = raiz().querySelector('h2');
    expect(encabezado?.textContent?.trim()).toBe('Venta V-1-7 registrada');
    expect(document.activeElement).toBe(encabezado);
  });

  it('la confirmacion enlaza al detalle de la venta por su ulid', async () => {
    await crearComponente();

    await registrarVentaDeEjemplo();

    const enlace = [...raiz().querySelectorAll('a')].find((a) => a.textContent?.includes('Ver venta'));
    expect(enlace?.getAttribute('href')).toBe(`/tpv/ventas/${ulidDePrueba(7)}`);
  });

  it('"Nueva venta" regresa a la captura con el foco en la busqueda de producto', async () => {
    await crearComponente();
    await registrarVentaDeEjemplo();
    const enfocar = vi.spyOn(LineasProductoComponent.prototype, 'focusBuscador');

    fixture.componentInstance.nuevaVenta();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(enfocar).toHaveBeenCalled();
  });

  it('lo que bloquea el cobro se anuncia en una region de estado que existe aunque no haya mensaje', async () => {
    await crearComponente();

    const estado = raiz().querySelector('[role="status"]');
    expect(estado?.textContent?.trim()).toBe('Agrega al menos un producto al carrito.');

    await registrarVentaDeEjemplo();
    fixture.componentInstance.nuevaVenta();
    fixture.detectChanges();
    fixture.componentInstance.onLineasCambio({ items: [{ variante_id: 5, cantidad: 1 }], subtotal: 100 });
    const lineasPago = fixture.debugElement.query(By.directive(LineasPagoComponent)).componentInstance as LineasPagoComponent;
    lineasPago.actualizarMetodoPago(0, 1);
    lineasPago.actualizarMontoPago(0, 100);
    fixture.detectChanges();

    expect(raiz().querySelector('[role="status"]')?.textContent?.trim()).toBe('');
  });

  it('los atajos estan documentados en pantalla como una lista con nombre', async () => {
    await crearComponente();

    const lista = raiz().querySelector('[aria-label="Atajos de teclado"]');
    expect(lista?.tagName).toBe('UL');
    expect([...(lista?.querySelectorAll('kbd') ?? [])].map((tecla) => tecla.textContent?.trim())).toEqual(['F2', 'F4', 'F9', 'Esc']);
  });
});
