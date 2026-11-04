import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { KpiComponent } from './kpi.component';

describe('KpiComponent accesibilidad', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpiComponent] }).compileComponents();
  });

  it('expone la variacion como texto para lectores de pantalla sin aria-label en un span generico', () => {
    const fixture = TestBed.createComponent(KpiComponent);
    fixture.componentRef.setInput('etiqueta', 'Ventas');
    fixture.componentRef.setInput('valor', 10);
    fixture.componentRef.setInput('variacion', 12.5);
    fixture.detectChanges();

    const variacion = fixture.nativeElement.querySelector('.ui-kpi__variacion') as HTMLElement;

    expect(variacion.getAttribute('role')).toBe('img');
    expect(variacion.getAttribute('aria-label')).toContain('Subió 12.5 puntos porcentuales');
  });
});
