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
});
