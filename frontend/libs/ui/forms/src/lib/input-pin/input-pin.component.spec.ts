import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InputPinComponent } from './input-pin.component';

describe('InputPinComponent', () => {
  let fixture: ComponentFixture<InputPinComponent>;
  let component: InputPinComponent;
  let input: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InputPinComponent] }).compileComponents();

    fixture = TestBed.createComponent(InputPinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  function tecla(key: string): void {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function botones(): HTMLButtonElement[] {
    return [...fixture.nativeElement.querySelectorAll('.ui-input-pin__tecla')] as HTMLButtonElement[];
  }

  it('no usa un input de tipo password y muestra puntos', () => {
    expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeNull();
    expect(input.type).toBe('text');

    tecla('1');
    tecla('2');

    expect(input.value).toBe('••');
  });

  it('acepta solo digitos, retroceso y Enter por teclado fisico', () => {
    const cambios = vi.fn();
    component.registerOnChange(cambios);

    tecla('1');
    tecla('a');
    tecla('2');
    expect(input.value).toBe('••');
    expect(cambios).toHaveBeenLastCalledWith('12');

    tecla('Backspace');
    expect(input.value).toBe('•');
    expect(cambios).toHaveBeenLastCalledWith('1');

    tecla('Enter');
    expect(input.value).toBe('•');
  });

  it('emite completo al alcanzar la longitud', () => {
    const completo = vi.fn();
    component.completo.subscribe(completo);

    tecla('1');
    tecla('2');
    tecla('3');
    expect(completo).not.toHaveBeenCalled();

    tecla('4');
    expect(completo).toHaveBeenCalledWith('1234');

    tecla('5');
    expect(input.value).toBe('••••');
    expect(completo).toHaveBeenCalledTimes(1);
  });

  it('respeta la longitud configurada', () => {
    fixture.componentRef.setInput('longitud', 6);
    fixture.detectChanges();

    const completo = vi.fn();
    component.completo.subscribe(completo);

    for (const digito of '123456') {
      tecla(digito);
    }

    expect(input.value).toBe('••••••');
    expect(completo).toHaveBeenCalledWith('123456');
  });

  it('funciona con el teclado tactil, borrar y limpiar', () => {
    const botonUno = botones().find((boton) => boton.textContent?.trim() === '1');
    const botonDos = botones().find((boton) => boton.textContent?.trim() === '2');
    const borrar = botones().find((boton) => boton.getAttribute('aria-label') === 'Borrar');
    const limpiar = botones().find((boton) => boton.textContent?.trim() === 'Limpiar');
    const cambios = vi.fn();
    component.registerOnChange(cambios);

    botonUno?.click();
    botonDos?.click();
    fixture.detectChanges();
    expect(input.value).toBe('••');
    expect(cambios).toHaveBeenLastCalledWith('12');

    borrar?.click();
    fixture.detectChanges();
    expect(input.value).toBe('•');

    limpiar?.click();
    fixture.detectChanges();
    expect(input.value).toBe('');
    expect(cambios).toHaveBeenLastCalledWith('');
  });

  it('escribe solo digitos desde writeValue y respeta disabled', () => {
    component.writeValue('12a34');
    fixture.detectChanges();

    expect(input.value).toBe('••••');

    component.setDisabledState(true);
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
    expect(botones().every((boton) => boton.disabled)).toBe(true);
  });
});
