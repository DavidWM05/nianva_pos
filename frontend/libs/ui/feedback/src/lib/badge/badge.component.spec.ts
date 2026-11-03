import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { BadgeComponent } from './badge.component';

function render(entidad: string, estado: string): HTMLElement {
  const fixture = TestBed.createComponent(BadgeComponent);
  fixture.componentRef.setInput('entidad', entidad);
  fixture.componentRef.setInput('estado', estado);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

describe('BadgeComponent', () => {
  it('pinta la etiqueta y el tono del registro', () => {
    const badge = render('venta', 'anulada').querySelector('.ui-badge');

    expect(badge?.textContent?.trim()).toBe('Anulada');
    expect(badge?.classList).toContain('ui-badge--peligro');
    expect(badge?.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('el estado normal de la entidad no pinta badge', () => {
    expect(render('venta', 'completada').querySelector('.ui-badge')).toBeNull();
  });

  it('un estado desconocido se muestra tal cual en tono neutro', () => {
    const badge = render('venta', 'reembolsada').querySelector('.ui-badge');

    expect(badge?.textContent?.trim()).toBe('reembolsada');
    expect(badge?.classList).toContain('ui-badge--neutro');
  });
});
