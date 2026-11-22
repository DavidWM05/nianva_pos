import { Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { CampoComponent } from '../campo/campo.component';
import { InputPinComponent } from './input-pin.component';

// SEG-12 y SEG-05: el mismo componente pide el PIN de caja y el del supervisor. Dentro de
// ui-campo, su nombre accesible es la etiqueta del campo; el aria-label fijo "PIN" la tapaba.

@Component({
  standalone: true,
  imports: [CampoComponent, FormsModule, InputPinComponent],
  template: `
    <ui-campo etiqueta="PIN del supervisor"><ui-input-pin [(ngModel)]="valor" /></ui-campo>
    <ui-input-pin />
  `,
})
class AnfitrionComponent {
  valor = '';
  readonly pin = viewChild.required(InputPinComponent);
}

@Component({
  standalone: true,
  imports: [CampoComponent, InputPinComponent],
  template: `<ui-campo etiqueta="PIN de caja"><ui-input-pin /></ui-campo>`,
})
class SinControlComponent {}

describe('InputPinComponent dentro de ui-campo', () => {
  function montar() {
    TestBed.configureTestingModule({ imports: [AnfitrionComponent] });
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();
    const [enCampo, suelto] = [...fixture.nativeElement.querySelectorAll('.ui-input-pin__entrada')] as HTMLInputElement[];

    return { fixture, enCampo, suelto };
  }

  it('toma el nombre de la etiqueta del campo y no lo tapa con aria-label', () => {
    const { fixture, enCampo } = montar();
    const etiqueta = fixture.nativeElement.querySelector(`label[for="${enCampo.id}"]`) as HTMLLabelElement | null;

    expect(enCampo.id).not.toBe('');
    expect(enCampo.hasAttribute('aria-label')).toBe(false);
    expect(etiqueta?.textContent).toContain('PIN del supervisor');
  });

  it('fuera de ui-campo conserva el nombre "PIN"', () => {
    const { suelto } = montar();

    expect(suelto.getAttribute('aria-label')).toBe('PIN');
  });

  it('dentro de ui-campo pero sin control de formulario (el campo no lo enlaza) conserva el nombre "PIN"', () => {
    TestBed.configureTestingModule({ imports: [SinControlComponent] });
    const fixture = TestBed.createComponent(SinControlComponent);
    fixture.detectChanges();
    const entrada = fixture.nativeElement.querySelector('.ui-input-pin__entrada') as HTMLInputElement;

    expect(entrada.getAttribute('aria-label')).toBe('PIN');
  });

  it('focus() lleva el foco a la entrada del PIN', () => {
    const { fixture, enCampo } = montar();
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.pin().focus();

    expect(document.activeElement).toBe(enCampo);
    fixture.nativeElement.remove();
  });
});
