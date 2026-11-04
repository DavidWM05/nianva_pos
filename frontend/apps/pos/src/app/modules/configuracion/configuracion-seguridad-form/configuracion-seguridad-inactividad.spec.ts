import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { ConfiguracionSeguridad } from '../configuracion.types';
import { ConfiguracionSeguridadFormComponent } from './configuracion-seguridad-form.component';

describe('ConfiguracionSeguridadFormComponent inactividad', () => {
  let fixture: ComponentFixture<ConfiguracionSeguridadFormComponent>;
  let dynamicForm: DynamicFormComponent;

  const valorInicial: ConfiguracionSeguridad = {
    dias_dispositivo_normal: 30,
    dias_dispositivo_admin: 14,
    minutos_inactividad: 30,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionSeguridadFormComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionSeguridadFormComponent);
    fixture.componentInstance.valorInicial = valorInicial;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();

    dynamicForm = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  });

  it('precarga y envia minutos_inactividad', () => {
    let emitido: ConfiguracionSeguridad | undefined;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    dynamicForm.form.get('minutos_inactividad')?.setValue(480);
    dynamicForm.onSubmit();

    expect(emitido).toEqual({
      dias_dispositivo_normal: 30,
      dias_dispositivo_admin: 14,
      minutos_inactividad: 480,
    });
  });

  it('muestra el error de campo que devuelve el servidor', () => {
    fixture.componentInstance.setServerErrors({
      minutos_inactividad: ['Debe estar entre 5 y 480.'],
    });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Debe estar entre 5 y 480.');
  });
});
