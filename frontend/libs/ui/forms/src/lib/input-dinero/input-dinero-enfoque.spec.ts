import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputDineroComponent } from './input-dinero.component';

// Flake de cotizaciones.spec.ts ("Total: $110", trace de CI 43338822232): al enfocar, el texto de
// edicion solo llegaba al input en la siguiente deteccion de cambios. Si esa deteccion caia entre
// seleccionar todo y escribir, el navegador perdia la seleccion y "20" quedaba pegado al "18".
describe('InputDineroComponent: enfoque y seleccion', () => {
  let fixture: ComponentFixture<InputDineroComponent>;
  let component: InputDineroComponent;
  let input: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InputDineroComponent] }).compileComponents();

    fixture = TestBed.createComponent(InputDineroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    component.writeValue(18);
    fixture.detectChanges();
  });

  it('escribir sobre todo el texto seleccionado lo reemplaza aunque la deteccion de cambios corra en medio', () => {
    const cambios = vi.fn();
    component.registerOnChange(cambios);

    input.focus();
    input.select();
    fixture.detectChanges();
    input.setRangeText('20', input.selectionStart ?? 0, input.selectionEnd ?? 0, 'end');
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect({ texto: input.value, control: cambios.mock.lastCall?.[0] }).toEqual({ texto: '20', control: 20 });
  });

  it('al enfocar, el input ya muestra el formato de edicion antes de la deteccion de cambios', () => {
    expect(input.value).toBe('$18.00');

    input.dispatchEvent(new Event('focus'));

    expect(input.value).toBe('18');
  });
});
