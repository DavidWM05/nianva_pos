import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { VentaService } from '@nianva/domain-tpv';
import { PantallaService } from '@nianva/ui-layout';
import { EntidadSelectorComponent } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { LineasProductoComponent } from './lineas-producto.component';

// Fase 4, B1 (UI-04 y UI-17): el carrito del TPV en pantalla angosta y con teclado o escaner.
describe('LineasProductoComponent (TPV táctil y con teclado)', () => {
  let fixture: ComponentFixture<LineasProductoComponent>;

  async function crearComponente(angosta = false, descuento: number | string = 0): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LineasProductoComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: PantallaService, useValue: { angosta: signal(angosta) } },
        {
          provide: VentaService,
          useValue: {
            cotizar: vi.fn().mockReturnValue(
              of({
                items: [{ variante_id: 5, regla_precio_id: null, cantidad: 2, precio_unitario: 100, descuento_aplicado: descuento, subtotal: 200 }],
                subtotal: 200,
              }),
            ),
            resolverCodigo: vi.fn(),
          },
        },
        {
          provide: BUSCADOR_PRODUCTO,
          useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn().mockReturnValue(of({ id: 1, nombre: 'Playera' })) },
        },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([{ id: 5, nombre: 'M / Rojo' }])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LineasProductoComponent);
    fixture.componentRef.setInput('presentacionesHabilitadas', true);
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const selector = (): EntidadSelectorComponent =>
    fixture.debugElement.query(By.directive(EntidadSelectorComponent)).componentInstance as EntidadSelectorComponent;

  function agregarLineaDeEjemplo(): void {
    fixture.componentInstance.onProductoSeleccionado(1);
    fixture.componentInstance.onVarianteSeleccionada(5);
    fixture.componentInstance['cantidadNueva'].set(2);
    fixture.componentInstance.agregarLinea();
    fixture.detectChanges();
  }

  it('al agregar una linea vacia el selector de producto y devuelve el foco a la busqueda', async () => {
    await crearComponente();
    const limpiar = vi.spyOn(selector(), 'limpiar');
    const enfocar = vi.spyOn(selector(), 'focus');

    agregarLineaDeEjemplo();

    expect(limpiar).toHaveBeenCalled();
    expect(enfocar).toHaveBeenCalled();
  });

  it('cancelar la linea en curso (Esc) tambien vacia el selector de producto', async () => {
    await crearComponente();
    const limpiar = vi.spyOn(selector(), 'limpiar');

    fixture.componentInstance.onProductoSeleccionado(1);
    fixture.componentInstance.cancelarLineaEnCurso();

    expect(limpiar).toHaveBeenCalled();
  });

  it('el boton de quitar dice que linea quita', async () => {
    await crearComponente();
    agregarLineaDeEjemplo();

    const quitar = raiz().querySelector<HTMLButtonElement>('button[aria-label^="Quitar"]');
    expect(quitar?.getAttribute('aria-label')).toBe('Quitar Playera (M / Rojo)');
  });

  it('un descuento de cero se muestra como guion, no como "-$0.00"', async () => {
    await crearComponente(false, '0.00');
    agregarLineaDeEjemplo();

    expect(raiz().textContent).not.toContain('-$0.00');
    expect(raiz().textContent).toContain('—');
  });

  it('la etiqueta "Código de barras" apunta a su input', async () => {
    await crearComponente();

    const etiqueta = [...raiz().querySelectorAll('label')].find((label) => label.textContent?.trim() === 'Código de barras');
    const id = etiqueta?.getAttribute('for');

    // Sin control de formulario, ui-campo no genera el id: label e input quedaban los dos con
    // "null", que se repite con cualquier otro campo igual de la pantalla.
    expect(id).toBeTruthy();
    expect(id).not.toBe('null');
    expect(raiz().querySelector(`input[id="${id}"]`)).not.toBeNull();
  });

  it('en pantalla angosta cada linea es una tarjeta con sus datos etiquetados, sin tabla', async () => {
    await crearComponente(true);
    agregarLineaDeEjemplo();

    expect(raiz().querySelector('table')).toBeNull();
    const lista = raiz().querySelector('ul[aria-label="Líneas del carrito"]');
    const tarjeta = lista?.querySelector('li');
    expect(tarjeta?.textContent).toContain('Playera (M / Rojo)');
    expect(tarjeta?.textContent).toContain('Precio unitario');
    expect(tarjeta?.textContent).toContain('Subtotal');
    expect(tarjeta?.querySelector('input[aria-label="Cantidad de Playera (M / Rojo)"]')).not.toBeNull();
    expect(tarjeta?.querySelector('button[aria-label="Quitar Playera (M / Rojo)"]')).not.toBeNull();
  });

  it('en pantalla ancha conserva la tabla', async () => {
    await crearComponente(false);
    agregarLineaDeEjemplo();

    expect(raiz().querySelector('table')).not.toBeNull();
  });
});
