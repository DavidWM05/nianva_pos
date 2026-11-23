import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { GraficaSerieComponent } from './grafica-serie.component';

describe('GraficaSerieComponent', () => {
  it('muestra fechas e importes y escala las barras a partir del máximo absoluto', () => {
    const fixture = TestBed.createComponent(GraficaSerieComponent);
    fixture.componentRef.setInput('titulo', 'Ventas por día');
    fixture.componentRef.setInput('puntos', [
      { fecha: '2026-06-11', importe: '100.00' },
      { fecha: '2026-06-12', importe: '-50.00' },
      { fecha: '2026-06-13', importe: 0 },
    ]);
    fixture.detectChanges();
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.querySelector('figure')?.getAttribute('aria-label')).toBe('Ventas por día');
    expect(vista.querySelector('time')?.textContent).toContain('11/06/2026');
    expect(vista.querySelectorAll('li')).toHaveLength(3);
    expect(vista.querySelector<HTMLMeterElement>('.ui-grafica-serie__barra--negativa')?.value).toBe(50);
  });

  it('expone el estado vacío sin etiquetas o escalas falsas', () => {
    const fixture = TestBed.createComponent(GraficaSerieComponent);
    fixture.componentRef.setInput('titulo', 'Ventas por día');
    fixture.componentRef.setInput('puntos', []);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin datos para graficar.');
    expect(fixture.nativeElement.querySelector('time')).toBeNull();
  });
});
