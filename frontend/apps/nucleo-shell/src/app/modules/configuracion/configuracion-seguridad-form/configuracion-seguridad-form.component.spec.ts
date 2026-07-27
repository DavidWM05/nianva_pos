import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { ConfiguracionSeguridadFormComponent } from './configuracion-seguridad-form.component';

describe('ConfiguracionSeguridadFormComponent', () => {
  let fixture: ComponentFixture<ConfiguracionSeguridadFormComponent>;
  let dynamicForm: DynamicFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionSeguridadFormComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionSeguridadFormComponent);
    // ngOnChanges no se dispara solo -- normalmente lo llama Angular cuando
    // el binding [valorInicial] cambia desde una plantilla host; aqui no
    // hay plantilla host, asi que se llama a mano tras asignar el input.
    fixture.componentInstance.valorInicial = { dias_dispositivo_normal: 30, dias_dispositivo_admin: 14 };
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();

    dynamicForm = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  });

  it('precarga los valores iniciales en el formulario', () => {
    expect(dynamicForm.form.get('dias_dispositivo_normal')?.value).toBe(30);
    expect(dynamicForm.form.get('dias_dispositivo_admin')?.value).toBe(14);
  });

  it('muestra un mensaje de rango claro cuando el valor supera 90', () => {
    const control = dynamicForm.form.get('dias_dispositivo_admin')!;
    control.setValue(91);
    control.markAsTouched();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Debe ser menor o igual a 90.');
  });

  it('muestra un mensaje de rango claro cuando el valor es menor a 1', () => {
    const control = dynamicForm.form.get('dias_dispositivo_normal')!;
    control.setValue(0);
    control.markAsTouched();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Debe ser mayor o igual a 1.');
  });

  it('emite guardar con los valores numericos cuando el formulario es valido', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    dynamicForm.form.get('dias_dispositivo_normal')?.setValue(45);
    dynamicForm.form.get('dias_dispositivo_admin')?.setValue(20);
    dynamicForm.onSubmit();

    expect(emitido).toEqual({ dias_dispositivo_normal: 45, dias_dispositivo_admin: 20 });
  });

  it('no emite guardar mientras el formulario tenga un valor fuera de rango', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    dynamicForm.form.get('dias_dispositivo_admin')?.setValue(91);
    dynamicForm.onSubmit();

    expect(emitido).toBeUndefined();
  });
});
