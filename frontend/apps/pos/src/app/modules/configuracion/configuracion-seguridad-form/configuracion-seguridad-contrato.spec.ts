import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { describe, expect, it } from 'vitest';

import { ConfiguracionSeguridad } from '../configuracion.types';
import { ConfiguracionSeguridadFormComponent } from './configuracion-seguridad-form.component';

// minutos_inactividad es obligatorio en el contrato (5-480): el formulario
// siempre lo muestra y lo envia, tambien en los extremos del rango.
describe('ConfiguracionSeguridadFormComponent con el contrato', () => {
  async function crear(valorInicial: ConfiguracionSeguridad): Promise<{
    fixture: ComponentFixture<ConfiguracionSeguridadFormComponent>;
    dynamicForm: DynamicFormComponent;
  }> {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionSeguridadFormComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfiguracionSeguridadFormComponent);
    fixture.componentInstance.valorInicial = valorInicial;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();

    return { fixture, dynamicForm: fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance };
  }

  for (const minutos of [5, 480]) {
    it(`muestra y envia minutos_inactividad cuando el valor inicial es ${minutos}`, async () => {
      const { fixture, dynamicForm } = await crear({
        dias_dispositivo_normal: 30,
        dias_dispositivo_admin: 14,
        minutos_inactividad: minutos,
      });
      let emitido: ConfiguracionSeguridad | undefined;
      fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

      expect((fixture.nativeElement as HTMLElement).querySelector('#minutos_inactividad')).not.toBeNull();

      dynamicForm.onSubmit();

      expect(emitido).toEqual({ dias_dispositivo_normal: 30, dias_dispositivo_admin: 14, minutos_inactividad: minutos });
    });
  }

  it('fuera del rango 5-480 no envia', async () => {
    const { fixture, dynamicForm } = await crear({ dias_dispositivo_normal: 30, dias_dispositivo_admin: 14, minutos_inactividad: 30 });
    let emitido: ConfiguracionSeguridad | undefined;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    for (const fuera of [4, 481]) {
      dynamicForm.form.get('minutos_inactividad')?.setValue(fuera);
      dynamicForm.onSubmit();
    }

    expect(emitido).toBeUndefined();
  });

  it('el campo siempre esta presente y es obligatorio, aunque el valor no llegue', async () => {
    const { fixture, dynamicForm } = await crear({ dias_dispositivo_normal: 30, dias_dispositivo_admin: 14 } as ConfiguracionSeguridad);
    let emitido: ConfiguracionSeguridad | undefined;
    fixture.componentInstance.guardar.subscribe((valor) => (emitido = valor));

    expect((fixture.nativeElement as HTMLElement).querySelector('#minutos_inactividad')).not.toBeNull();

    dynamicForm.onSubmit();

    expect(emitido).toBeUndefined();
  });

  it('el tipo ConfiguracionSeguridad exige minutos_inactividad, como el contrato', () => {
    // @ts-expect-error minutos_inactividad es obligatorio en ConfiguracionSeguridadResource
    const incompleta: ConfiguracionSeguridad = { dias_dispositivo_normal: 30, dias_dispositivo_admin: 14 };

    expect(incompleta).toBeDefined();
  });
});
