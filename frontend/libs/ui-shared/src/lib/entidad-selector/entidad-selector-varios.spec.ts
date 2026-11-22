import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EntidadSelectorComponent } from './entidad-selector.component';
import { BuscadorDeHijos, BuscadorEntidad, EntidadBuscable } from './entidad-selector.types';

// Fase 4, B1 (UI-17): la venta tiene tres selectores en la misma pantalla (cliente, lista de
// precio y producto). Cada etiqueta debe apuntar a su propio control, y el carrito necesita
// vaciar el selector de producto al agregar una linea o al cancelarla con Esc.
const ENTIDAD: EntidadBuscable = { id: 1, nombre: 'Agua 1L' };
const HIJOS: EntidadBuscable[] = [{ id: 10, nombre: 'Variante uno' }];

@Component({
  standalone: true,
  imports: [EntidadSelectorComponent],
  template: `
    <nucleo-entidad-selector [buscador]="buscador" label="Cliente" placeholder="Buscar cliente" />
    <nucleo-entidad-selector
      [buscador]="buscador"
      [buscadorHijos]="buscadorHijos"
      label="Producto"
      labelHijos="Variante"
      placeholder="Buscar producto"
      [valorInicial]="1"
    />
  `,
})
class DosSelectoresComponent {
  readonly buscador = {
    buscar: vi.fn().mockReturnValue(of([ENTIDAD])),
    obtener: vi.fn().mockReturnValue(of(ENTIDAD)),
  } as unknown as BuscadorEntidad;
  readonly buscadorHijos = { hijosDe: vi.fn().mockReturnValue(of(HIJOS)) } as unknown as BuscadorDeHijos;
}

describe('EntidadSelectorComponent (varios en la misma pantalla)', () => {
  let fixture: ComponentFixture<DosSelectoresComponent>;

  beforeAll(() => {
    window.matchMedia ??= ((consulta: string) =>
      ({
        matches: false,
        media: consulta,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DosSelectoresComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(DosSelectoresComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  /** El control al que apunta la etiqueta con ese texto, como lo resuelve el navegador. */
  const controlDe = (texto: string): HTMLElement | null => {
    const etiqueta = [...raiz().querySelectorAll('label')].find((label) => label.textContent?.trim() === texto);
    const id = etiqueta?.getAttribute('for');

    return id ? raiz().querySelector(`[id="${id}"]`) : null;
  };

  it('cada etiqueta apunta al control de su propio selector, sin ids repetidos', () => {
    expect(controlDe('Cliente')?.getAttribute('placeholder')).toBe('Buscar cliente');
    expect(controlDe('Producto')?.getAttribute('placeholder')).toBe('Buscar producto');
    expect(controlDe('Variante')?.getAttribute('role')).toBe('combobox');

    const ids = [...raiz().querySelectorAll('[id]')].map((elemento) => elemento.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('el select de hijos toma su nombre de la etiqueta de su propio selector', () => {
    const select = raiz().querySelector('mat-select');
    // Material antepone sus propios ids (y un espacio) a los del aria-labelledby.
    const nombres = (select?.getAttribute('aria-labelledby') ?? '')
      .trim()
      .split(/\s+/)
      .map((id) => raiz().querySelector(`[id="${id}"]`)?.textContent?.trim());

    expect(nombres).toContain('Variante');
  });

  it('limpiar() vacia el texto, la entidad elegida y los hijos sin emitir seleccion', async () => {
    const selectores = fixture.debugElement
      .queryAll(By.directive(EntidadSelectorComponent))
      .map((nodo) => nodo.componentInstance as EntidadSelectorComponent);
    const producto = selectores[1];
    const emitido = vi.fn();
    producto.seleccionado.subscribe(emitido);
    const entradaProducto = raiz().querySelectorAll<HTMLInputElement>('input')[1];
    expect(entradaProducto.value).toBe('Agua 1L');

    producto.limpiar();
    // El autocompletado escribe el valor en el input en una microtarea (writeValue).
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(entradaProducto.value).toBe('');
    expect(raiz().querySelector('mat-select')).toBeNull();
    expect(emitido).not.toHaveBeenCalled();
  });
});
