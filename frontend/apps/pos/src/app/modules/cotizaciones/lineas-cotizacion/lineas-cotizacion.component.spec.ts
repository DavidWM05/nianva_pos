import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { VentaService } from '../../tpv/venta.service';
import { CotizacionDetalle } from '../cotizacion.types';
import { LineasCotizacionCambio, LineasCotizacionComponent } from './lineas-cotizacion.component';

describe('LineasCotizacionComponent', () => {
  let fixture: ComponentFixture<LineasCotizacionComponent>;
  let ventaService: { cotizar: ReturnType<typeof vi.fn> };

  async function crearComponente(): Promise<void> {
    ventaService = {
      cotizar: vi.fn().mockReturnValue(
        of({
          items: [{ variante_id: 5, regla_precio_id: null, cantidad: 2, precio_unitario: 100, descuento_aplicado: 10, subtotal: 190 }],
          subtotal: 190,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [LineasCotizacionComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: VentaService, useValue: ventaService },
        {
          provide: BUSCADOR_PRODUCTO,
          useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 1, nombre: 'Playera' })) },
        },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([{ id: 5, nombre: 'M / Rojo' }])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LineasCotizacionComponent);
    fixture.detectChanges();
  }

  function agregarLineaDeEjemplo(): void {
    fixture.componentInstance.onProductoSeleccionado(1);
    fixture.componentInstance.onVarianteSeleccionada(5);
    fixture.componentInstance['cantidadNueva'].set(2);
    fixture.componentInstance.agregarLinea();
    fixture.detectChanges();
  }

  it('al agregar una linea, prellena el precio/descuento sugerido por VentaService.cotizar() pero queda editable', async () => {
    await crearComponente();

    let emitido: LineasCotizacionCambio | undefined;
    fixture.componentInstance.cambio.subscribe((c) => (emitido = c));

    agregarLineaDeEjemplo();

    expect(ventaService.cotizar).toHaveBeenCalledWith([{ variante_id: 5, cantidad: 2 }]);
    expect(fixture.componentInstance['lineas']()).toHaveLength(1);
    expect(fixture.componentInstance['lineas']()[0].precio_unitario).toBe(100);
    expect(fixture.componentInstance['lineas']()[0].descuento).toBe(10);
    // subtotal = cantidad*precio - descuento = 2*100 - 10 = 190
    expect(fixture.componentInstance['subtotal']()).toBe(190);
    expect(emitido?.items).toEqual([{ variante_id: 5, cantidad: 2, precio_unitario: 100, descuento: 10 }]);
  });

  it('sin sugerencia de precio disponible (variante sin reglas), agrega la linea igual en 0 -- nunca bloquea', async () => {
    await crearComponente();
    ventaService.cotizar.mockReturnValue(throwError(() => new Error('sin reglas')));

    agregarLineaDeEjemplo();

    expect(fixture.componentInstance['lineas']()).toHaveLength(1);
    expect(fixture.componentInstance['lineas']()[0].precio_unitario).toBe(0);
    expect(fixture.componentInstance['lineas']()[0].descuento).toBe(0);
  });

  it('actualizarPrecio() sobreescribe el precio sugerido y recalcula el subtotal reactivamente', async () => {
    await crearComponente();
    agregarLineaDeEjemplo();

    fixture.componentInstance.actualizarPrecio(0, 150);

    expect(fixture.componentInstance['lineas']()[0].precio_unitario).toBe(150);
    // 2*150 - 10 = 290
    expect(fixture.componentInstance['subtotal']()).toBe(290);
  });

  it('actualizarDescuento() recalcula el subtotal reactivamente', async () => {
    await crearComponente();
    agregarLineaDeEjemplo();

    fixture.componentInstance.actualizarDescuento(0, 50);

    // 2*100 - 50 = 150
    expect(fixture.componentInstance['subtotal']()).toBe(150);
  });

  it('quitarLinea() la elimina y recalcula el subtotal', async () => {
    await crearComponente();
    agregarLineaDeEjemplo();

    fixture.componentInstance.quitarLinea(0);

    expect(fixture.componentInstance['lineas']()).toHaveLength(0);
    expect(fixture.componentInstance['subtotal']()).toBe(0);
  });

  it('sin precio_manual, precio y descuento son de solo lectura y no se pueden alterar', async () => {
    await crearComponente();
    fixture.componentInstance.precioManual = false;
    agregarLineaDeEjemplo();

    fixture.componentInstance.actualizarPrecio(0, 150);
    fixture.componentInstance.actualizarDescuento(0, 50);

    expect(fixture.componentInstance['lineas']()[0].precio_unitario).toBe(100);
    expect(fixture.componentInstance['lineas']()[0].descuento).toBe(10);

    const inputs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="number"]'),
    ).filter((input) => input.min === '0');
    expect(inputs).toHaveLength(2);
    expect(inputs.every((input) => input.readOnly)).toBe(true);
  });

  it('con valorInicial (editar una cotizacion existente), precarga las lineas desde los detalles crudos del backend', async () => {
    await crearComponente();

    const detalles: CotizacionDetalle[] = [
      { id: 1, variante_id: 8, variante: { id: 8, nombre: 'Pantalón (32)' }, cantidad: 3, precio_unitario: '200.00', descuento: '0.00', subtotal: '600.00' },
    ];
    fixture.componentInstance.valorInicial = detalles;
    fixture.componentInstance.ngOnChanges();

    expect(fixture.componentInstance['lineas']()).toEqual([
      { variante_id: 8, etiqueta: 'Pantalón (32)', cantidad: 3, precio_unitario: 200, descuento: 0 },
    ]);
    expect(fixture.componentInstance['subtotal']()).toBe(600);
  });
});
