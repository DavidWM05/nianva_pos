import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import {
  BUSCADOR_CATEGORIA,
  BUSCADOR_PRODUCTO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
} from '../../core/buscadores-entidad.tokens';
import { ReglaPrecioFormComponent } from './regla-precio-form/regla-precio-form.component';
import { ConfiguracionFormComponent } from '../configuracion/configuracion-form/configuracion-form.component';

describe('Reglas combinables y cupón configurable', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReglaPrecioFormComponent, ConfiguracionFormComponent],
      providers: [
        ...proveedoresDePantalla(),
        provideAnimationsAsync(),
        { provide: BUSCADOR_CATEGORIA, useValue: { buscar: () => of([]) } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: () => of([]) } },
        {
          provide: BUSCADOR_VARIANTE_DE_PRODUCTO,
          useValue: { hijosDe: () => of([]) },
        },
      ],
    }).compileComponents();
  });

  it('regla envía prioridad y combinable con defaults compatibles', () => {
    const fixture = TestBed.createComponent(ReglaPrecioFormComponent);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    expect(form.form.get('prioridad')?.value).toBe(0);
    expect(form.form.get('combinable')?.value).toBe(false);
    form.form.patchValue({
      nombre: 'Combinable',
      porcentaje: 10,
      prioridad: 7,
      combinable: true,
    });
    const emitido = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    form.onSubmit();
    expect(emitido).toHaveBeenCalledWith(
      expect.objectContaining({ prioridad: 7, combinable: true }),
    );
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    expect(form.form.get('prioridad')?.disabled).toBe(true);
    expect(form.form.get('combinable')?.disabled).toBe(true);
  });

  it('prioridad rechaza negativos, fracciones y valores fuera de unsignedSmallInteger', () => {
    const fixture = TestBed.createComponent(ReglaPrecioFormComponent);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    form.form.patchValue({ nombre: 'Inválida', porcentaje: 10 });
    const emitido = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    for (const prioridad of [-1, 0.5, 65536]) {
      form.form.get('prioridad')?.setValue(prioridad);
      expect(form.form.get('prioridad')?.invalid).toBe(true);
      form.onSubmit();
    }
    expect(emitido).not.toHaveBeenCalled();
  });

  it('configuración conserva el default true y permite apagar el cupón con promociones', () => {
    const fixture = TestBed.createComponent(ConfiguracionFormComponent);
    fixture.componentRef.setInput('valorInicial', {
      moneda: '$',
      mensaje_ticket: null,
      logo_url: null,
      mostrar_rfc: true,
      mostrar_telefono: true,
      mostrar_correo: true,
      backup_auto: false,
      backup_frecuencia: 'semanal',
      backup_ultimo: null,
      codigo_barras_automatico: false,
      tasa_iva_default: '16.0000',
    });
    fixture.detectChanges();
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    expect(form.form.get('cupon_combinable_con_promociones')?.value).toBe(true);
    form.form.get('cupon_combinable_con_promociones')?.setValue(false);
    const emitido = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    form.onSubmit();
    expect(emitido).toHaveBeenCalledWith(
      expect.objectContaining({ cupon_combinable_con_promociones: false }),
    );
  });
});
