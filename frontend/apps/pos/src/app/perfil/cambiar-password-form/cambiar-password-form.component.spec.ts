import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { CambiarPasswordFormComponent } from './cambiar-password-form.component';

describe('CambiarPasswordFormComponent', () => {
  let fixture: ComponentFixture<CambiarPasswordFormComponent>;
  let dynamicForm: DynamicFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CambiarPasswordFormComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    fixture = TestBed.createComponent(CambiarPasswordFormComponent);
    fixture.detectChanges();

    dynamicForm = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  });

  function llenarFormulario(passwordActual: string, password: string, confirmacion: string): void {
    dynamicForm.form.get('password_actual')?.setValue(passwordActual);
    dynamicForm.form.get('password')?.setValue(password);
    dynamicForm.form.get('password_confirmation')?.setValue(confirmacion);
  }

  it('emite guardar cuando la confirmacion coincide', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    llenarFormulario('actual-123', 'nueva-password-456', 'nueva-password-456');
    dynamicForm.onSubmit();

    expect(emitido).toEqual({
      password_actual: 'actual-123',
      password: 'nueva-password-456',
      password_confirmation: 'nueva-password-456',
    });
  });

  it('no emite guardar y muestra un error si la confirmacion no coincide', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    llenarFormulario('actual-123', 'nueva-password-456', 'otra-distinta-789');
    dynamicForm.onSubmit();
    fixture.detectChanges();

    expect(emitido).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Las contraseñas no coinciden.');
  });

  it('no emite guardar mientras el formulario tenga campos requeridos vacios', () => {
    let emitido: unknown;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    dynamicForm.onSubmit();

    expect(emitido).toBeUndefined();
  });
});
