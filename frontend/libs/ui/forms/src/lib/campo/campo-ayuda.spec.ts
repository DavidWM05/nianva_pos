import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { beforeEach, describe, expect, it } from 'vitest';

import { InputDineroComponent } from '../input-dinero/input-dinero.component';
import { CampoComponent } from './campo.component';

// UI-04: la ayuda y el error de ui-campo describen al control, sea uno propio de libs/ui o uno
// proyectado con id (un matInput suelto, como el codigo de recuperacion de 2FA, o un input nativo).
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent, MatFormFieldModule, MatInputModule, InputDineroComponent],
  template: `
    <ui-campo #campo etiqueta="Código de recuperación" ayuda="Cada código sirve una sola vez">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <input matInput type="text" [id]="campo.controlId() ?? 'recuperacion'" [formControl]="codigo" />
      </mat-form-field>
    </ui-campo>

    <ui-campo #nativo etiqueta="Asunto" ayuda="Lo ve el cliente en su correo">
      <input
        type="text"
        [id]="nativo.controlId()"
        [attr.aria-describedby]="nativo.mensaje() ? nativo.errorId() : null"
        [formControl]="asunto"
      />
    </ui-campo>

    <ui-campo etiqueta="Precio" ayuda="Antes de impuestos">
      <ui-input-dinero [formControl]="precio" />
    </ui-campo>
  `,
})
class AnfitrionComponent {
  readonly codigo = new FormControl('');
  readonly asunto = new FormControl('', Validators.required);
  readonly precio = new FormControl<number | null>(null);
}

describe('CampoComponent: la ayuda describe al control', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AnfitrionComponent] }).compileComponents();
  });

  function crear() {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const textos = (control: Element) =>
      (control.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean)
        .map((id) => el.querySelector(`[id="${id}"]`)?.textContent?.trim());

    return { fixture, el, textos, inputs: [...el.querySelectorAll('input')] };
  }

  it('un matInput proyectado con id queda descrito por la ayuda', () => {
    const { inputs, textos } = crear();

    expect(textos(inputs[0])).toContain('Cada código sirve una sola vez');
  });

  it('con un error, el matInput queda descrito por la ayuda y por el error; al corregirlo, solo por la ayuda', () => {
    const { fixture, inputs, textos } = crear();

    fixture.componentInstance.codigo.setErrors({ servidor: 'Código inválido.' });
    fixture.detectChanges();
    expect(textos(inputs[0])).toEqual(expect.arrayContaining(['Cada código sirve una sola vez', 'Código inválido.']));

    inputs[0].value = 'ABCD-1234';
    inputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(textos(inputs[0])).toEqual(['Cada código sirve una sola vez']);
  });

  it('un input nativo que ya enlaza el error conserva su enlace y suma la ayuda, sin repetir ids', () => {
    const { fixture, inputs, textos } = crear();
    const asunto = fixture.componentInstance.asunto;

    asunto.markAsTouched();
    asunto.updateValueAndValidity();
    fixture.detectChanges();

    const ids = (inputs[1].getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(textos(inputs[1])).toEqual(expect.arrayContaining(['Lo ve el cliente en su correo', 'Asunto es obligatorio.']));
  });

  it('los controles propios de libs/ui tambien quedan descritos por la ayuda', () => {
    const { inputs, textos } = crear();

    expect(textos(inputs[2])).toContain('Antes de impuestos');
  });
});
