import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CATEGORIA, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { ReglaPrecioFormComponent } from './regla-precio-form.component';

describe('ReglaPrecioFormComponent', () => {
  let fixture: ComponentFixture<ReglaPrecioFormComponent>;
  let dynamicForm: DynamicFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReglaPrecioFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: BUSCADOR_CATEGORIA, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReglaPrecioFormComponent);
    // ngOnChanges no se dispara solo -- normalmente lo llama Angular cuando
    // el binding [valorInicial] cambia desde una plantilla host; aqui no
    // hay plantilla host, asi que se llama a mano (mismo patron ya usado
    // en configuracion-seguridad-form.component.spec.ts).
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();

    const { By } = await import('@angular/platform-browser');
    dynamicForm = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  });

  it('con tipo=porcentaje (default) muestra Valor y oculta los campos de nxm/bundle', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Valor');
    expect(texto).not.toContain('Cantidad que compra');
    expect(texto).not.toContain('Cantidad que paga');
    expect(texto).not.toContain('Precio del bundle');
  });

  it('cambiar tipo a nxm oculta Valor y muestra cantidad_compra + cantidad_paga', () => {
    dynamicForm.form.get('tipo')?.setValue('nxm');
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Valor');
    expect(texto).toContain('Cantidad que compra');
    expect(texto).toContain('Cantidad que paga');
    expect(texto).not.toContain('Precio del bundle');
  });

  it('cambiar tipo a bundle muestra cantidad_compra + precio_bundle pero no cantidad_paga', () => {
    dynamicForm.form.get('tipo')?.setValue('bundle');
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cantidad que compra');
    expect(texto).toContain('Precio del bundle');
    expect(texto).not.toContain('Cantidad que paga');
  });

  it('el selector de "Aplica a" solo muestra el selector de entidad correspondiente', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('nucleo-entidad-selector')).toBeNull();

    fixture.componentInstance.onCambiarAplicaA('producto');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('nucleo-entidad-selector')).not.toBeNull();
  });
});
