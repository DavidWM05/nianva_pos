import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { FormatoKpi, KpiComponent } from './kpi.component';

describe('KpiComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpiComponent] }).compileComponents();
  });

  function render(valor: number | string | null, formato: FormatoKpi = 'texto', unidad = '') {
    const fixture = TestBed.createComponent(KpiComponent);
    fixture.componentRef.setInput('etiqueta', 'Ventas del periodo');
    fixture.componentRef.setInput('valor', valor);
    fixture.componentRef.setInput('formato', formato);
    fixture.componentRef.setInput('unidad', unidad);
    fixture.detectChanges();

    return fixture;
  }

  it('formatea cada tipo de valor con los pipes', () => {
    expect(render(1234.5, 'dinero').nativeElement.textContent).toContain('$1,234.50');
    expect(render(3, 'cantidad', 'pieza').nativeElement.textContent).toContain('3 pieza');
    expect(render(15, 'porcentaje').nativeElement.textContent).toContain('15%');
    expect(render('Sin datos', 'texto').nativeElement.textContent).toContain('Sin datos');
  });

  it('pinta variacion positiva con tono de exito, flecha y texto accesible', () => {
    const fixture = render(10);
    fixture.componentRef.setInput('variacion', 12.5);
    fixture.detectChanges();

    const variacion = fixture.nativeElement.querySelector('.ui-kpi__variacion') as HTMLElement;

    expect(variacion.textContent).toContain('+12.5%');
    expect(variacion.classList).toContain('ui-kpi__variacion--exito');
    expect(variacion.querySelector('.pi-arrow-up')).not.toBeNull();
    expect(variacion.getAttribute('aria-label')).toContain('Subió');
  });

  it('pinta variacion negativa con tono de peligro y texto accesible', () => {
    const fixture = render(10);
    fixture.componentRef.setInput('variacion', -4);
    fixture.detectChanges();

    const variacion = fixture.nativeElement.querySelector('.ui-kpi__variacion') as HTMLElement;

    expect(variacion.textContent).toContain('-4%');
    expect(variacion.classList).toContain('ui-kpi__variacion--peligro');
    expect(variacion.querySelector('.pi-arrow-down')).not.toBeNull();
    expect(variacion.getAttribute('aria-label')).toContain('Bajó');
  });

  it('pinta variacion cero en tono neutro', () => {
    const fixture = render(10);
    fixture.componentRef.setInput('variacion', 0);
    fixture.detectChanges();

    const variacion = fixture.nativeElement.querySelector('.ui-kpi__variacion') as HTMLElement;

    expect(variacion.textContent).toContain('0%');
    expect(variacion.classList).toContain('ui-kpi__variacion--neutro');
    expect(variacion.getAttribute('aria-label')).toBe('Sin variación');
  });

  it('con cargando muestra skeleton y no texto de carga', () => {
    const fixture = render(10);
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ui-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/cargando/i);
    expect(fixture.nativeElement.querySelector('.ui-kpi__valor')).toBeNull();
  });
});
