import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { DynamicFormComponent } from './dynamic-form.component';
import { DynamicFormField } from './dynamic-form.types';

// Serie 50d: los mismos atributos que pone ui-campo (libs/ui/forms), replicados en el markup
// propio de dynamic-form, para cada tipo de control.
const CAMPOS: DynamicFormField[] = [
  { name: 'nombre', label: 'Nombre', type: 'text', required: true },
  { name: 'clave', label: 'Clave', type: 'password', required: true },
  { name: 'cantidad', label: 'Cantidad', type: 'number', required: true },
  { name: 'notas', label: 'Notas', type: 'textarea', required: true },
  {
    name: 'tipo',
    label: 'Tipo',
    type: 'select',
    required: true,
    options: [{ label: 'Efectivo', value: 'efectivo' }],
  },
  { name: 'inicio', label: 'Inicio', type: 'date', required: true },
  { name: 'opcional', label: 'Opcional', type: 'text' },
];

describe('DynamicFormComponent (accesibilidad)', () => {
  let component: DynamicFormComponent;
  let raiz: HTMLElement;
  let detectar: () => void;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    const fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
    component.fields = CAMPOS;
    component.ngOnChanges();
    fixture.detectChanges();
    raiz = fixture.nativeElement as HTMLElement;
    detectar = () => fixture.detectChanges();
  });

  const control = (etiqueta: string): HTMLElement | null => {
    const label = [...raiz.querySelectorAll('label[for]')].find((l) => l.textContent?.replace('*', '').trim() === etiqueta);

    return document.getElementById(label?.getAttribute('for') ?? '');
  };
  const obligatorios = CAMPOS.filter((f) => f.required);

  it('aria-required="true" en cada campo obligatorio, y no en los opcionales', () => {
    for (const field of obligatorios) {
      expect(control(field.label)?.getAttribute('aria-required'), field.name).toBe('true');
    }
    expect(control('Opcional')?.getAttribute('aria-required')).not.toBe('true');
  });

  it('aria-invalid="true" solo cuando el campo muestra un error', () => {
    for (const field of obligatorios) {
      expect(control(field.label)?.getAttribute('aria-invalid'), field.name).not.toBe('true');
    }

    component.onSubmit();
    detectar();

    for (const field of obligatorios) {
      expect(control(field.label)?.getAttribute('aria-invalid'), field.name).toBe('true');
    }
  });

  it('aria-describedby apunta al mensaje de error, que tiene id propio', () => {
    component.onSubmit();
    detectar();

    for (const field of obligatorios) {
      const descrito = control(field.label)?.getAttribute('aria-describedby') ?? '';
      const mensaje = descrito
        .split(' ')
        .map((id) => document.getElementById(id))
        .find((el) => el?.textContent?.includes(`${field.label} es obligatorio.`));

      expect(mensaje, field.name).toBeTruthy();
    }
  });

  it('sin error, el control no describe un mensaje inexistente', () => {
    for (const field of obligatorios) {
      const descrito = control(field.label)?.getAttribute('aria-describedby');

      for (const id of descrito?.split(' ') ?? []) {
        expect(document.getElementById(id)?.textContent ?? '', field.name).not.toContain('obligatorio');
      }
    }
  });
});
