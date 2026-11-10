import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { DynamicFormComponent } from './dynamic-form.component';
import { DynamicFormField } from './dynamic-form.types';

// Serie 50d: comportamiento visible del formulario por tipo de campo, sin depender de la
// libreria que dibuja los controles. Debe pasar igual antes y despues de quitar PrimeNG.
const FECHA = new Date(2026, 10, 9);

const TODOS_LOS_TIPOS: DynamicFormField[] = [
  { name: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 20 },
  { name: 'clave', label: 'Clave', type: 'password' },
  { name: 'cantidad', label: 'Cantidad', type: 'number' },
  { name: 'notas', label: 'Notas', type: 'textarea', maxLength: 200 },
  {
    name: 'tipo',
    label: 'Tipo',
    type: 'select',
    options: [
      { label: 'Efectivo', value: 'efectivo' },
      { label: 'Tarjeta', value: 'tarjeta' },
    ],
    defaultValue: 'efectivo',
  },
  { name: 'activo', label: 'Activo', type: 'checkbox', defaultValue: true },
  { name: 'inicio', label: 'Inicio', type: 'date', defaultValue: FECHA },
];

async function crear(fields: DynamicFormField[], opciones: { readonly?: boolean; submitLabel?: string } = {}) {
  await TestBed.configureTestingModule({
    imports: [DynamicFormComponent],
    providers: [provideAnimationsAsync()],
  }).compileComponents();

  const fixture = TestBed.createComponent(DynamicFormComponent);
  fixture.componentInstance.fields = fields;
  fixture.componentInstance.readonly = opciones.readonly ?? false;
  if (opciones.submitLabel) {
    fixture.componentInstance.submitLabel = opciones.submitLabel;
  }
  fixture.componentInstance.ngOnChanges();
  fixture.detectChanges();
  await fixture.whenStable();
  // Algunos controles asignan su valor inicial en una microtarea y piden otra pasada.
  fixture.detectChanges();

  return fixture;
}

function controlDe(fixture: ComponentFixture<DynamicFormComponent>, etiqueta: string): HTMLElement | null {
  const label = [...(fixture.nativeElement as HTMLElement).querySelectorAll('label[for]')].find(
    (l) => l.textContent?.replace('*', '').trim() === etiqueta,
  );

  return document.getElementById(label?.getAttribute('for') ?? '');
}

function deshabilitado(control: HTMLElement | null): boolean {
  return (control as HTMLInputElement | null)?.disabled === true || control?.getAttribute('aria-disabled') === 'true';
}

describe('DynamicFormComponent (comportamiento)', () => {
  let fixture: ComponentFixture<DynamicFormComponent>;
  let component: DynamicFormComponent;

  beforeEach(async () => {
    fixture = await crear(TODOS_LOS_TIPOS, { submitLabel: 'Guardar método' });
    component = fixture.componentInstance;
  });

  it('cada tipo de campo pinta un control real al que apunta su label', () => {
    for (const field of TODOS_LOS_TIPOS) {
      const control = controlDe(fixture, field.label);

      expect(control?.matches('input, select, textarea, [role="combobox"]'), field.name).toBe(true);
    }
  });

  it('los campos de texto, password, numero y textarea conservan id = field.name', () => {
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('#nombre')?.tagName).toBe('INPUT');
    expect(raiz.querySelector('#clave')?.getAttribute('type')).toBe('password');
    expect(raiz.querySelector('#cantidad')?.getAttribute('type')).toBe('number');
    expect(raiz.querySelector('#notas')?.tagName).toBe('TEXTAREA');
  });

  it('maxLength llega como atributo maxlength al control', () => {
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('#nombre')?.getAttribute('maxlength')).toBe('20');
    expect(raiz.querySelector('#notas')?.getAttribute('maxlength')).toBe('200');
  });

  it('marca con * los campos obligatorios', () => {
    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('label[for]')];
    const conAsterisco = labels.filter((l) => l.textContent?.includes('*')).map((l) => l.textContent?.replace('*', '').trim());

    expect(conAsterisco).toEqual(['Nombre']);
  });

  it('el boton de envio muestra submitLabel y envia el formulario', () => {
    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type="submit"]');
    let emitido: Record<string, unknown> | undefined;
    component.formSubmit.subscribe((v) => (emitido = v));
    component.form.get('nombre')?.setValue('Vales');

    expect(boton?.textContent?.trim()).toBe('Guardar método');
    boton?.click();

    expect(emitido?.['nombre']).toBe('Vales');
  });

  it('no muestra errores hasta que el campo se toca, y luego el de obligatorio', () => {
    const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto()).not.toContain('Nombre es obligatorio.');

    component.onSubmit();
    fixture.detectChanges();

    expect(texto()).toContain('Nombre es obligatorio.');
  });

  it('setServerErrors muestra el primer mensaje del servidor en su campo', () => {
    component.setServerErrors({ nombre: ['El nombre ya existe.', 'Otro'], notas: 'Demasiado largo.' });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('El nombre ya existe.');
    expect(texto).not.toContain('Otro');
    expect(texto).toContain('Demasiado largo.');
  });

  it('las fechas entran y salen como Date', () => {
    let emitido: Record<string, unknown> | undefined;
    component.formSubmit.subscribe((v) => (emitido = v));
    component.form.get('nombre')?.setValue('Vales');

    component.onSubmit();

    expect(emitido?.['inicio']).toBeInstanceOf(Date);
    expect((emitido?.['inicio'] as Date).getTime()).toBe(FECHA.getTime());
  });

  it('el checkbox refleja su valor en el control', () => {
    expect((controlDe(fixture, 'Activo') as HTMLInputElement).checked).toBe(true);
  });

  it('el select muestra la etiqueta de la opcion elegida', () => {
    expect(controlDe(fixture, 'Tipo')?.closest('.dynamic-form__field, .nucleo-df__campo')?.textContent).toContain('Efectivo');
  });

  it('elegir una opcion del select guarda su value en el formulario', async () => {
    // jsdom no trae matchMedia y algunos overlays lo consultan al abrirse.
    window.matchMedia ??= ((consulta: string) =>
      ({
        matches: false,
        media: consulta,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
    controlDe(fixture, 'Tipo')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const opcion = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === 'Tarjeta');
    opcion?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.get('tipo')?.value).toBe('tarjeta');
  });
});

describe('DynamicFormComponent (mensajes de validacion)', () => {
  it('usa el texto de cada validador', async () => {
    const fixture = await crear([
      { name: 'correo', label: 'Correo', type: 'text', validators: [Validators.email] },
      { name: 'codigo', label: 'Código', type: 'text', validators: [Validators.minLength(3)] },
      { name: 'dias', label: 'Días', type: 'number', validators: [Validators.min(1), Validators.max(90)] },
    ]);
    const form = fixture.componentInstance.form;
    form.get('correo')?.setValue('no-es-correo');
    form.get('codigo')?.setValue('ab');
    form.get('dias')?.setValue(100);
    form.markAllAsTouched();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Correo invalido.');
    expect(texto).toContain('Debe tener al menos 3 caracteres.');
    expect(texto).toContain('Debe ser menor o igual a 90.');
  });
});

describe('DynamicFormComponent (readonly)', () => {
  it('deshabilita en el DOM cada tipo de control, checkbox, select y fecha incluidos', async () => {
    const fixture = await crear(TODOS_LOS_TIPOS, { readonly: true });

    for (const field of TODOS_LOS_TIPOS) {
      expect(deshabilitado(controlDe(fixture, field.label)), field.name).toBe(true);
    }
  });
});
