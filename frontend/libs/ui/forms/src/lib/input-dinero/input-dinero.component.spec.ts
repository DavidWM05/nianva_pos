import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputDineroComponent } from './input-dinero.component';

describe('InputDineroComponent', () => {
  let fixture: ComponentFixture<InputDineroComponent>;
  let component: InputDineroComponent;
  let input: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InputDineroComponent] }).compileComponents();

    fixture = TestBed.createComponent(InputDineroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  function escribir(valor: string): void {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enfocar(): void {
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  }

  function salir(): void {
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  it('muestra el formato al salir y el numero limpio al editar', () => {
    component.writeValue(1234.5);
    fixture.detectChanges();

    expect(input.value).toBe('$1,234.50');

    enfocar();
    expect(input.value).toBe('1234.5');

    salir();
    expect(input.value).toBe('$1,234.50');
  });

  it('limita a dos decimales y emite el valor numerico', () => {
    const cambios = vi.fn();
    component.registerOnChange(cambios);

    escribir('12.345');

    expect(input.value).toBe('12.34');
    expect(cambios).toHaveBeenLastCalledWith(12.34);
  });

  it('no permite negativos por defecto y si con permitirNegativo', () => {
    const cambios = vi.fn();
    component.registerOnChange(cambios);

    escribir('-5');
    expect(input.value).toBe('5');
    expect(cambios).toHaveBeenLastCalledWith(5);

    fixture.componentRef.setInput('permitirNegativo', true);
    escribir('-5');
    expect(input.value).toBe('-5');
    expect(cambios).toHaveBeenLastCalledWith(-5);

    salir();
    expect(input.value).toBe('-$5.00');
  });

  it('emite null al vaciar y limpia el valor al salir', () => {
    const cambios = vi.fn();
    component.registerOnChange(cambios);

    escribir('');
    expect(cambios).toHaveBeenLastCalledWith(null);

    salir();
    expect(input.value).toBe('');
  });

  it('acota el valor a min y max al salir', () => {
    const cambios = vi.fn();
    fixture.componentRef.setInput('min', 10);
    fixture.componentRef.setInput('max', 20);
    component.registerOnChange(cambios);

    escribir('5');
    salir();

    expect(cambios).toHaveBeenLastCalledWith(10);
    expect(input.value).toBe('$10.00');
  });

  it('declara inputmode decimal y respeta disabled', () => {
    expect(input.getAttribute('inputmode')).toBe('decimal');

    component.setDisabledState(true);
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
  });
});
