import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { DynamicFormComponent } from './dynamic-form.component';
import { DynamicFormField } from './dynamic-form.types';

describe('DynamicFormComponent', () => {
  let fixture: ComponentFixture<DynamicFormComponent>;
  let component: DynamicFormComponent;

  const fields: DynamicFormField[] = [
    {
      name: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: [
        { label: 'Porcentaje', value: 'porcentaje' },
        { label: 'NxM', value: 'nxm' },
      ],
      defaultValue: 'porcentaje',
    },
    {
      name: 'valor',
      label: 'Valor',
      type: 'number',
      required: true,
      dependsOn: { field: 'tipo', values: ['porcentaje', 'monto_fijo'] },
    },
    {
      name: 'cantidad_compra',
      label: 'Cantidad de compra',
      type: 'number',
      required: true,
      dependsOn: { field: 'tipo', values: ['nxm', 'bundle'] },
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
    component.fields = fields;
    // ngOnChanges no se dispara solo -- normalmente lo llama Angular cuando
    // el binding [fields] cambia desde una plantilla host; aqui no hay
    // plantilla host, asi que se llama a mano (mismo patron que
    // configuracion-seguridad-form.component.spec.ts).
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('muestra solo los campos cuyo dependsOn coincide con el valor actual', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Valor');
    expect(texto).not.toContain('Cantidad de compra');
  });

  it('cambia los campos visibles al cambiar el campo del que dependen', () => {
    component.form.get('tipo')?.setValue('nxm');
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Valor');
    expect(texto).toContain('Cantidad de compra');
  });

  it('un campo requerido oculto no bloquea el envio del formulario', () => {
    component.form.get('tipo')?.setValue('nxm');
    component.form.get('cantidad_compra')?.setValue(3);
    // 'valor' quedo oculto (tipo=nxm) y vacio -- no deberia impedir que el
    // formulario sea valido, ver requeridoSiVisible().
    fixture.detectChanges();

    let emitido: unknown;
    component.formSubmit.subscribe((v) => (emitido = v));
    component.onSubmit();

    expect(emitido).toBeDefined();
    expect(component.form.valid).toBe(true);
  });

  it('un campo requerido SI visible sigue bloqueando el envio si esta vacio', () => {
    // tipo=porcentaje (default): 'valor' es requerido y esta vacio.
    component.onSubmit();

    let emitido: unknown;
    component.formSubmit.subscribe((v) => (emitido = v));
    component.onSubmit();

    expect(emitido).toBeUndefined();
    expect(component.form.valid).toBe(false);
  });

  it('readonly=true deshabilita todos los controles y no renderiza el boton de submit', async () => {
    // OnPush: `readonly` debe estar en su valor final ANTES del primer
    // detectChanges() -- mutarlo despues no dispara un nuevo chequeo del
    // @if que lo usa en la plantilla (mismo motivo que en otros specs de
    // esta sesion, ej. variantes-list.component.spec.ts).
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    const otroFixture = TestBed.createComponent(DynamicFormComponent);
    otroFixture.componentInstance.fields = fields;
    otroFixture.componentInstance.readonly = true;
    otroFixture.componentInstance.ngOnChanges();
    otroFixture.detectChanges();

    expect(otroFixture.componentInstance.form.disabled).toBe(true);
    expect(otroFixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
  });

  it('field.readonly deshabilita solo ese campo, el resto del formulario sigue editable', () => {
    const conCampoReadonly: DynamicFormField[] = [
      ...fields,
      { name: 'codigo_barras', label: 'Código de barras', type: 'text', defaultValue: '000111222333', readonly: true },
    ];
    component.fields = conCampoReadonly;
    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.form.get('codigo_barras')?.disabled).toBe(true);
    expect(component.form.get('tipo')?.disabled).toBe(false);
  });

  it('onSubmit incluye el valor de un campo deshabilitado (getRawValue, no .value)', () => {
    const conCampoReadonly: DynamicFormField[] = [
      { name: 'talla', label: 'Talla', type: 'text', defaultValue: 'M' },
      { name: 'codigo_barras', label: 'Código de barras', type: 'text', defaultValue: '000111222333', readonly: true },
    ];
    component.fields = conCampoReadonly;
    component.ngOnChanges();
    fixture.detectChanges();

    let emitido: Record<string, unknown> | undefined;
    component.formSubmit.subscribe((v) => (emitido = v));
    component.onSubmit();

    expect(emitido?.['talla']).toBe('M');
    expect(emitido?.['codigo_barras']).toBe('000111222333');
  });
});
