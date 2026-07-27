import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { ConfiguracionTenant } from '../configuracion.types';
import { ConfiguracionFormComponent } from './configuracion-form.component';

describe('ConfiguracionFormComponent', () => {
  let fixture: ComponentFixture<ConfiguracionFormComponent>;
  let dynamicForm: DynamicFormComponent;

  const valorInicial: ConfiguracionTenant = {
    moneda: '$',
    mensaje_ticket: 'Gracias por su compra',
    logo_url: null,
    mostrar_rfc: true,
    mostrar_telefono: false,
    mostrar_correo: true,
    backup_auto: false,
    backup_frecuencia: 'semanal',
    backup_ultimo: null,
    codigo_barras_automatico: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionFormComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionFormComponent);
    // ngOnChanges no se dispara solo -- normalmente lo llama Angular cuando
    // el binding [valorInicial] cambia desde una plantilla host; aqui no
    // hay plantilla host, asi que se llama a mano tras asignar el input.
    fixture.componentInstance.valorInicial = valorInicial;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();

    dynamicForm = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  });

  it('precarga los valores actuales, incluyendo los checkboxes', () => {
    expect(dynamicForm.form.get('moneda')?.value).toBe('$');
    expect(dynamicForm.form.get('mensaje_ticket')?.value).toBe('Gracias por su compra');
    expect(dynamicForm.form.get('mostrar_rfc')?.value).toBe(true);
    expect(dynamicForm.form.get('mostrar_telefono')?.value).toBe(false);
    expect(dynamicForm.form.get('backup_frecuencia')?.value).toBe('semanal');
  });

  it('emite guardar con los valores correctos cuando el formulario es valido', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    dynamicForm.form.get('moneda')?.setValue('USD');
    dynamicForm.form.get('backup_auto')?.setValue(true);
    dynamicForm.form.get('backup_frecuencia')?.setValue('diario');
    dynamicForm.onSubmit();

    expect(emitido).toEqual({
      moneda: 'USD',
      mensaje_ticket: 'Gracias por su compra',
      logo_url: null,
      mostrar_rfc: true,
      mostrar_telefono: false,
      mostrar_correo: true,
      backup_auto: true,
      backup_frecuencia: 'diario',
      codigo_barras_automatico: false,
    });
  });

  it('no emite guardar si la moneda queda vacia', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    dynamicForm.form.get('moneda')?.setValue('');
    dynamicForm.onSubmit();

    expect(emitido).toBeUndefined();
  });

  it('no emite guardar si la URL del logo tiene un formato invalido', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    dynamicForm.form.get('logo_url')?.setValue('no-es-una-url');
    dynamicForm.onSubmit();

    expect(emitido).toBeUndefined();
  });
});
