import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { InputDineroComponent } from './input-dinero/input-dinero.component';
import { InputCantidadComponent } from './input-cantidad/input-cantidad.component';

describe('inputs con decimales de API-02', () => {
  it.each(['1250.50', 1250.5])('dinero acepta %s y conserva el formato visible', async valor => {
    await TestBed.configureTestingModule({ imports: [InputDineroComponent] }).compileComponents();
    const fixture = TestBed.createComponent(InputDineroComponent);
    fixture.componentInstance.writeValue(valor);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('input')?.value).toBe('$1,250.50');
  });
  it.each(['0.500', 0.5])('cantidad acepta %s para editar el mismo valor', async valor => {
    await TestBed.configureTestingModule({ imports: [InputCantidadComponent] }).compileComponents();
    const fixture = TestBed.createComponent(InputCantidadComponent);
    fixture.componentInstance.writeValue(valor);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('input')?.value).toBe('0.5');
  });
});
