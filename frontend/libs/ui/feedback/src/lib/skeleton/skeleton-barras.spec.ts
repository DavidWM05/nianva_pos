import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { SkeletonComponent } from './skeleton.component';

// Reemplazan a los casos de skeleton.component.spec.ts que buscaban la etiqueta p-skeleton de
// PrimeNG (retirados en el 49b): ahora las barras se buscan por su clase propia.
function barras(entradas: Record<string, unknown> = {}): HTMLElement[] {
  const fixture = TestBed.createComponent(SkeletonComponent);

  for (const [nombre, valor] of Object.entries(entradas)) {
    fixture.componentRef.setInput(nombre, valor);
  }

  fixture.detectChanges();

  return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.ui-skeleton__barra')];
}

describe('SkeletonComponent: barras', () => {
  it('pinta una barra por linea, con la ultima mas corta', () => {
    const lineas = barras({ lineas: 3 });

    expect(lineas).toHaveLength(3);
    expect(lineas[2].style.width).toBe('60%');
    expect(lineas[0].style.width).toBe('100%');
  });

  it('un bloque toma el ancho y el alto que recibe', () => {
    const [barra] = barras({ forma: 'bloque', ancho: '12rem', alto: '12rem' });

    expect(barra.style.width).toBe('12rem');
    expect(barra.style.height).toBe('12rem');
  });

  it('un circulo es tan ancho como alto', () => {
    const [barra] = barras({ forma: 'circulo' });

    expect(barra.style.width).toBe('3rem');
    expect(barra.style.height).toBe('3rem');
    expect(barra.classList).toContain('ui-skeleton__circulo');
  });
});
