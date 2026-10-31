import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { EntidadSelectorComponent } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { VentaService } from '../venta.service';
import { LineasProductoCambio, LineasProductoComponent } from './lineas-producto.component';

describe('LineasProductoComponent', () => {
  let fixture: ComponentFixture<LineasProductoComponent>;
  let ventaService: { cotizar: ReturnType<typeof vi.fn> };

  async function crearComponente(): Promise<void> {
    ventaService = {
      cotizar: vi.fn().mockReturnValue(
        of({
          items: [{ variante_id: 5, regla_precio_id: null, cantidad: 2, precio_unitario: 100, descuento_aplicado: 0, subtotal: 200 }],
          subtotal: 200,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [LineasProductoComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: VentaService, useValue: ventaService },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 1, nombre: 'Playera' })) } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([{ id: 5, nombre: 'M / Rojo' }])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LineasProductoComponent);
    fixture.detectChanges();
  }

  function agregarLineaDeEjemplo(): void {
    fixture.componentInstance.onProductoSeleccionado(1);
    fixture.componentInstance.onVarianteSeleccionada(5);
    fixture.componentInstance['cantidadNueva'].set(2);
    fixture.componentInstance.agregarLinea();
    fixture.detectChanges();
  }

  it('agrega una linea y muestra el precio resuelto por el backend (cotizar), nunca calculado en el frontend', async () => {
    await crearComponente();

    let emitido: LineasProductoCambio | undefined;
    fixture.componentInstance.cambio.subscribe((c) => (emitido = c));

    agregarLineaDeEjemplo();

    expect(ventaService.cotizar).toHaveBeenCalledWith([{ variante_id: 5, cantidad: 2 }]);
    expect(fixture.componentInstance['lineas']()).toHaveLength(1);
    expect(fixture.componentInstance['lineas']()[0].precio_unitario).toBe(100);
    expect(fixture.componentInstance['subtotal']()).toBe(200);
    expect(emitido).toEqual({ items: [{ variante_id: 5, cantidad: 2 }], subtotal: 200 });
  });

  it('quitar una linea vuelve a cotizar y emite el carrito vacio', async () => {
    await crearComponente();
    agregarLineaDeEjemplo();

    let emitido: LineasProductoCambio | undefined;
    fixture.componentInstance.cambio.subscribe((c) => (emitido = c));

    fixture.componentInstance.quitarLinea(0);
    fixture.detectChanges();

    expect(fixture.componentInstance['lineas']()).toHaveLength(0);
    expect(emitido).toEqual({ items: [], subtotal: 0 });
  });

  it('reiniciar() limpia el carrito', async () => {
    await crearComponente();
    agregarLineaDeEjemplo();

    fixture.componentInstance.reiniciar();

    expect(fixture.componentInstance['lineas']()).toHaveLength(0);
    expect(fixture.componentInstance['subtotal']()).toBe(0);
  });

  it('no agrega la linea si la cantidad excede el stock_actual reportado por el backend', async () => {
    await crearComponente();
    fixture.componentInstance['variantesDelProductoSeleccionado'].set([{ id: 5, nombre: 'M / Rojo', stock_actual: 3 }]);

    fixture.componentInstance.onVarianteSeleccionada(5);
    fixture.componentInstance['cantidadNueva'].set(5);
    fixture.detectChanges();

    expect(fixture.componentInstance['cantidadExcedeStock']()).toBe(true);

    fixture.componentInstance.agregarLinea();

    expect(fixture.componentInstance['lineas']()).toHaveLength(0);
    expect(ventaService.cotizar).not.toHaveBeenCalled();
  });

  it('reporta sin stock (rojo) cuando stock_actual es 0', async () => {
    await crearComponente();
    fixture.componentInstance['variantesDelProductoSeleccionado'].set([{ id: 5, nombre: 'M / Rojo', stock_actual: 0 }]);

    fixture.componentInstance.onVarianteSeleccionada(5);
    fixture.detectChanges();

    expect(fixture.componentInstance['stockVarianteSeleccionada']()).toBe(0);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Sin stock disponible');
  });

  it('cancelarLineaEnCurso() descarta la seleccion en curso sin tocar lineas ya agregadas al carrito', async () => {
    await crearComponente();
    agregarLineaDeEjemplo();

    fixture.componentInstance.onProductoSeleccionado(1);
    fixture.componentInstance.onVarianteSeleccionada(5);
    fixture.componentInstance['cantidadNueva'].set(3);

    fixture.componentInstance.cancelarLineaEnCurso();

    expect(fixture.componentInstance['productoSeleccionadoId']()).toBeNull();
    expect(fixture.componentInstance['varianteSeleccionadaId']()).toBeNull();
    expect(fixture.componentInstance['cantidadNueva']()).toBe(1);
    expect(fixture.componentInstance['lineas']()).toHaveLength(1);
  });

  it('focusBuscador() delega el foco en el EntidadSelectorComponent del producto', async () => {
    await crearComponente();

    const { By } = await import('@angular/platform-browser');
    const selector = fixture.debugElement.query(By.directive(EntidadSelectorComponent))
      .componentInstance as EntidadSelectorComponent;
    const focusSpy = vi.spyOn(selector, 'focus');

    fixture.componentInstance.focusBuscador();

    expect(focusSpy).toHaveBeenCalled();
  });

  it('cambiarCantidad clamea contra el stock congelado al agregar la linea, no contra uno nuevo', async () => {
    await crearComponente();
    fixture.componentInstance['variantesDelProductoSeleccionado'].set([{ id: 5, nombre: 'M / Rojo', stock_actual: 4 }]);
    fixture.componentInstance.onVarianteSeleccionada(5);
    fixture.componentInstance['cantidadNueva'].set(2);
    fixture.componentInstance.agregarLinea();

    fixture.componentInstance.cambiarCantidad(0, 10);

    expect(fixture.componentInstance['lineas']()[0].cantidad).toBe(4);
  });
});
