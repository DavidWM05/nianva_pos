import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputCantidadComponent } from './input-cantidad.component';

describe('InputCantidadComponent', () => {
  let fixture: ComponentFixture<InputCantidadComponent>;
  let component: InputCantidadComponent;
  let input: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InputCantidadComponent] }).compileComponents();

    fixture = TestBed.createComponent(InputCantidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  function escribir(valor: string): void {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('usa tres decimales por defecto y los limita', () => {
    const cambios = vi.fn();
    component.registerOnChange(cambios);

    escribir('1.2345');

    expect(input.value).toBe('1.234');
    expect(cambios).toHaveBeenLastCalledWith(1.234);
    expect(input.getAttribute('inputmode')).toBe('decimal');
  });

  it('respeta la entrada decimales y cambia inputmode', () => {
    fixture.componentRef.setInput('decimales', 2);
    fixture.detectChanges();

    const cambios = vi.fn();
    component.registerOnChange(cambios);
    escribir('1.239');

    expect(input.value).toBe('1.23');
    expect(cambios).toHaveBeenLastCalledWith(1.23);

    fixture.componentRef.setInput('decimales', 0);
    fixture.detectChanges();

    escribir('1.9');
    expect(input.value).toBe('1');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });

  it('muestra la unidad como sufijo y emite null al vaciar', () => {
    fixture.componentRef.setInput('unidad', 'kg');
    fixture.detectChanges();

    const cambios = vi.fn();
    component.registerOnChange(cambios);

    expect(fixture.nativeElement.textContent).toContain('kg');

    escribir('');
    expect(cambios).toHaveBeenLastCalledWith(null);
  });

  it('normaliza el texto al salir y marca touched', () => {
    const tocado = vi.fn();
    component.registerOnTouched(tocado);

    escribir('1.');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.value).toBe('1');
    expect(tocado).toHaveBeenCalledOnce();
  });
});
