import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { CampoComponent } from '../campo/campo.component';
import { InputCodigoComponent } from './input-codigo.component';

// 50j: codigo de un solo uso visible (TOTP de la app de autenticacion). A diferencia de
// ui-input-pin, los digitos se ven y el sistema puede autocompletarlo.
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CampoComponent, InputCodigoComponent],
  template: `
    <ui-campo etiqueta="Código de verificación">
      <ui-input-codigo [formControl]="codigo" (completo)="completos.push($event)" />
    </ui-campo>
  `,
})
class AnfitrionComponent {
  readonly codigo = new FormControl('', { nonNullable: true });
  readonly completos: string[] = [];
}

function crear() {
  TestBed.configureTestingModule({ imports: [AnfitrionComponent] });
  const fixture = TestBed.createComponent(AnfitrionComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector('input') as HTMLInputElement;
  const escribir = (texto: string) => {
    input.value = texto;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  return { fixture, el, input, escribir, anfitrion: fixture.componentInstance };
}

describe('InputCodigoComponent', () => {
  it('queda enlazado a la etiqueta de ui-campo', () => {
    const { el, input } = crear();

    expect(input.id).not.toBe('');
    expect(el.querySelector(`label[for="${input.id}"]`)?.textContent?.trim()).toBe('Código de verificación');
  });

  it('pide teclado numerico, acepta el autocompletado del codigo y admite 6 caracteres', () => {
    const { input } = crear();

    expect(input.type).toBe('text');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.maxLength).toBe(6);
  });

  it('solo se queda con los digitos de lo escrito o pegado, y se ven', () => {
    const { input, escribir, anfitrion } = crear();

    escribir('12 a3-45');

    expect(anfitrion.codigo.value).toBe('12345');
    expect(input.value).toBe('12345');
  });

  it('avisa con `completo` al llegar a la longitud, una vez', () => {
    const { escribir, anfitrion } = crear();

    escribir('12345');
    expect(anfitrion.completos).toEqual([]);
    escribir('123456');
    escribir('1234567');

    expect(anfitrion.completos).toEqual(['123456']);
    expect(anfitrion.codigo.value).toBe('123456');
  });

  it('escribe el valor del control y lo vacia', () => {
    const { fixture, input, anfitrion } = crear();

    anfitrion.codigo.setValue('654321');
    fixture.detectChanges();
    expect(input.value).toBe('654321');

    anfitrion.codigo.setValue('');
    fixture.detectChanges();
    expect(input.value).toBe('');
  });

  it('un error del servidor deja el campo invalido y descrito por el mensaje', () => {
    const { fixture, el, input, anfitrion } = crear();

    anfitrion.codigo.setErrors({ servidor: 'Código inválido.' });
    fixture.detectChanges();
    const descrito = input.getAttribute('aria-describedby');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(descrito).toBeTruthy();
    expect(el.querySelector(`#${descrito}`)?.textContent?.trim()).toBe('Código inválido.');
  });

  it('respeta disabled', () => {
    const { fixture, input, anfitrion } = crear();

    anfitrion.codigo.disable();
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
  });
});
