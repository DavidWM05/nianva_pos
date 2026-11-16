import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { DynamicFormComponent } from './dynamic-form.component';
import { DynamicFormField } from './dynamic-form.types';

// UI-11b: un campo recibe sus límites del contrato (`limite`, la forma de `limitesDe()` de
// @nianva/api-contrato) en lugar de números escritos a mano.
const CAMPOS: DynamicFormField[] = [
  { name: 'nombre', label: 'Nombre', type: 'text', limite: { requerido: true, maxLength: 120 } },
  { name: 'notas', label: 'Notas', type: 'textarea', limite: { requerido: false, maxLength: 500 } },
  { name: 'porcentaje', label: 'Porcentaje', type: 'number', limite: { requerido: false, minimum: 0, maximum: 100, decimales: 4 } },
  { name: 'monto', label: 'Monto', type: 'number', limite: { requerido: false, minimum: 0, decimales: 2 } },
  { name: 'alias', label: 'Alias', type: 'text', required: false, limite: { requerido: true, maxLength: 30 } },
];

describe('DynamicFormComponent: límites del contrato', () => {
  let fixture: ComponentFixture<DynamicFormComponent>;
  let component: DynamicFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
    component.fields = CAMPOS;
    component.ngOnChanges();
    fixture.detectChanges();
  });

  const control = (id: string): HTMLInputElement => {
    const elemento = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
    if (!elemento) throw new Error(`Sin control #${id}`);
    return elemento;
  };
  const campo = (nombre: string): DynamicFormField => {
    const encontrado = CAMPOS.find((c) => c.name === nombre);
    if (!encontrado) throw new Error(`Sin campo ${nombre}`);
    return encontrado;
  };
  const errorDe = (nombre: string) => component.errorFor(campo(nombre));
  const tocar = (nombre: string, valor: unknown) => {
    component.form.get(nombre)?.setValue(valor);
    component.form.get(nombre)?.markAsTouched();
  };

  it('requerido del contrato: pinta el asterisco, aria-required y exige el valor', () => {
    const etiqueta = (fixture.nativeElement as HTMLElement).querySelector('label[for="nombre"]');

    expect(etiqueta?.textContent).toContain('*');
    expect(control('nombre').getAttribute('aria-required')).toBe('true');
    tocar('nombre', '');
    expect(errorDe('nombre')).toBe('Nombre es obligatorio.');
  });

  it('maxLength del contrato en el atributo y en la validación', () => {
    expect(control('nombre').getAttribute('maxlength')).toBe('120');
    expect(control('notas').getAttribute('maxlength')).toBe('500');
    tocar('nombre', 'x'.repeat(121));
    expect(errorDe('nombre')).toBe('No puede tener más de 120 caracteres.');
  });

  it('minimum, maximum y decimales en los atributos del input numérico', () => {
    expect(control('porcentaje').getAttribute('min')).toBe('0');
    expect(control('porcentaje').getAttribute('max')).toBe('100');
    expect(control('porcentaje').getAttribute('step')).toBe('0.0001');
    expect(control('monto').getAttribute('step')).toBe('0.01');
    expect(control('monto').hasAttribute('max')).toBe(false);
  });

  it('minimum y maximum se validan con el mensaje de siempre', () => {
    tocar('porcentaje', 101);
    expect(errorDe('porcentaje')).toBe('Debe ser menor o igual a 100.');
    tocar('monto', -1);
    expect(errorDe('monto')).toBe('Debe ser mayor o igual a 0.');
  });

  it('rechaza más decimales de los que acepta el contrato', () => {
    tocar('monto', 10.555);
    expect(errorDe('monto')).toBe('Admite como máximo 2 decimales.');
    tocar('monto', 10.55);
    expect(errorDe('monto')).toBeNull();
    tocar('porcentaje', 12.3456);
    expect(errorDe('porcentaje')).toBeNull();
  });

  it('un `required` explícito del campo gana al del contrato', () => {
    tocar('alias', '');
    expect(errorDe('alias')).toBeNull();
    expect(control('alias').getAttribute('maxlength')).toBe('30');
  });
});
