import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { FormControlDirective } from '@angular/forms';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { InputDineroComponent } from '@nianva/ui-forms';
import { VarianteFormComponent } from './variante-form/variante-form.component';
import { ProductoFormComponent } from './producto-form/producto-form.component';
import { ProductoService } from '@nianva/domain-inventario';
import { ConfiguracionFormComponent } from '../configuracion/configuracion-form/configuracion-form.component';

describe('Catálogo: precio por variante e IVA incluido', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        VarianteFormComponent,
        ProductoFormComponent,
        ConfiguracionFormComponent,
      ],
      providers: [
        provideAnimationsAsync(),
        {
          provide: ProductoService,
          useValue: { categorias: () => of([]), departamentos: () => of([]) },
        },
      ],
    }).compileComponents();
  });

  it('la variante ofrece precio y costo opcionales con ayuda y envía los valores escritos', () => {
    const fixture = TestBed.createComponent(VarianteFormComponent);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    const campos = fixture.debugElement.queryAll(
      By.directive(InputDineroComponent),
    );
    expect(campos).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain(
      'vacío = usa el del producto',
    );
    campos[0].injector.get(FormControlDirective).control.setValue(0);
    campos[1].injector.get(FormControlDirective).control.setValue(12.35);
    const guardar = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    fixture.debugElement
      .query(By.directive(DynamicFormComponent))
      .componentInstance.onSubmit();
    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ precio_venta: 0, costo: 12.35 }),
    );
  });

  it('la variante sin importes envía null para heredar y bloquea los negativos', () => {
    const fixture = TestBed.createComponent(VarianteFormComponent);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    const guardar = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    form.onSubmit();
    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ precio_venta: null, costo: null }),
    );
    guardar.mockClear();
    const campo = fixture.debugElement.queryAll(
      By.directive(InputDineroComponent),
    )[0];
    campo.injector.get(FormControlDirective).control.setValue(-1);
    form.onSubmit();
    expect(guardar).not.toHaveBeenCalled();
  });

  it('producto distingue herencia, tasa cero y exención en el payload', () => {
    const fixture = TestBed.createComponent(ProductoFormComponent);
    fixture.detectChanges();
    fixture.detectChanges();
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    expect(form.form.get('tasa_iva')?.value).toBeNull();
    form.form.patchValue({
      nombre: 'Producto',
      tasa_iva: '0.0000',
      exento_iva: true,
    });
    const guardar = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    form.onSubmit();
    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ tasa_iva: 0, exento_iva: true }),
    );
  });

  it('configuración precarga y guarda la tasa default del tenant', () => {
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
      tasa_iva_default: '8.0000',
    });
    fixture.detectChanges();
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    expect(form.form.get('tasa_iva_default')?.value).toBe('8.0000');
    form.form.get('tasa_iva_default')?.setValue('16.0000');
    const guardar = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    form.onSubmit();
    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ tasa_iva_default: 16 }),
    );
  });
});
