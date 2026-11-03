import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { InputDineroComponent } from '../input-dinero/input-dinero.component';
import { aplicarErroresServidor } from './aplicar-errores-servidor';
import { CampoComponent } from './campo.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent, InputDineroComponent],
  template: `
    <form [formGroup]="form">
      <ui-campo etiqueta="Precio" [requerido]="true">
        <ui-input-dinero formControlName="precio" />
      </ui-campo>
    </form>
  `,
})
class HostCampoComponent {
  readonly form = new FormGroup({ precio: new FormControl<number | null>(null) });
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent, InputDineroComponent],
  template: `
    <form [formGroup]="primero">
      <ui-campo etiqueta="Precio"><ui-input-dinero formControlName="precio" /></ui-campo>
    </form>
    <form [formGroup]="segundo">
      <ui-campo etiqueta="Precio"><ui-input-dinero formControlName="precio" /></ui-campo>
    </form>
  `,
})
class DosFormulariosComponent {
  readonly primero = new FormGroup({ precio: new FormControl<number | null>(null) });
  readonly segundo = new FormGroup({ precio: new FormControl<number | null>(null) });
}

describe('CampoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostCampoComponent] }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(HostCampoComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('pinta etiqueta, requerido y aria-required en el control', () => {
    const fixture = render();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(fixture.nativeElement.textContent).toContain('Precio');
    expect(fixture.nativeElement.textContent).toContain('*');
    expect(input.getAttribute('aria-required')).toBe('true');
  });

  it('muestra el error de servidor y lo quita al editar', () => {
    const fixture = render();
    const host = fixture.componentInstance;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(aplicarErroresServidor(host.form, { error: { errors: { precio: ['Monto invalido'] } } })).toBe(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Monto invalido');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('ui-campo-error-precio');

    input.value = '25';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.form.get('precio')?.hasError('servidor')).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Monto invalido');
  });

  it('dos campos con el mismo nombre en la pagina no repiten id', () => {
    const fixture = TestBed.createComponent(DosFormulariosComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = [...el.querySelectorAll('input')];
    const etiquetas = [...el.querySelectorAll('label')];

    expect(inputs[0].id).not.toBe(inputs[1].id);
    expect(etiquetas.map((etiqueta) => etiqueta.getAttribute('for'))).toEqual(inputs.map((input) => input.id));
  });

  it('ignora los campos del 422 que no existen en el formulario', () => {
    const fixture = render();
    const host = fixture.componentInstance;

    expect(aplicarErroresServidor(host.form, { error: { errors: { inexistente: ['No existe'] } } })).toBe(false);
  });

  it('devuelve false si el error no trae errors de validacion', () => {
    const fixture = render();
    const host = fixture.componentInstance;

    expect(aplicarErroresServidor(host.form, { error: { message: 'Error de negocio' } })).toBe(false);
  });
});
