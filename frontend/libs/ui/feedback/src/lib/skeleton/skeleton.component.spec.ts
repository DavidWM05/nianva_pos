import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { SkeletonComponent } from './skeleton.component';

function render(entradas: Record<string, unknown> = {}): HTMLElement {
  const fixture = TestBed.createComponent(SkeletonComponent);

  for (const [nombre, valor] of Object.entries(entradas)) {
    fixture.componentRef.setInput(nombre, valor);
  }

  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

describe('SkeletonComponent', () => {
  it('se anuncia como contenido en carga para lectores de pantalla', () => {
    const host = render();

    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.getAttribute('aria-label')).toBe('Cargando contenido');
  });

  it('pinta una barra por linea, con la ultima mas corta', () => {
    const barras = render({ lineas: 3 }).querySelectorAll<HTMLElement>('p-skeleton');

    expect(barras).toHaveLength(3);
    expect(barras[2].style.width).toBe('60%');
    expect(barras[0].style.width).toBe('100%');
  });

  it('un bloque toma el ancho y el alto que recibe', () => {
    const barra = render({ forma: 'bloque', ancho: '12rem', alto: '12rem' }).querySelector<HTMLElement>('p-skeleton');

    expect(barra?.style.width).toBe('12rem');
    expect(barra?.style.height).toBe('12rem');
  });

  it('un circulo es tan ancho como alto', () => {
    const barra = render({ forma: 'circulo' }).querySelector<HTMLElement>('p-skeleton') as HTMLElement;

    expect(barra.style.width).toBe('3rem');
    expect(barra.style.height).toBe('3rem');
  });
});
