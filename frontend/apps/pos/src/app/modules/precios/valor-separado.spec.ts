import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import type { CuerpoDe } from '@nianva/api-contrato';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_CATEGORIA, BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { CuponFormComponent } from './cupon-form/cupon-form.component';
import { CuponFormPayload, ReglaPrecioFormPayload } from '@nianva/domain-precios';
import { ReglaPrecioFormComponent } from './regla-precio-form/regla-precio-form.component';

// DAT-02b: reglas y cupones mandan `porcentaje` o `monto` segun el tipo. El formulario muestra
// solo el campo que toca y manda el otro en null (el backend responde 422 si llega con valor).
async function montar<T extends ReglaPrecioFormComponent | CuponFormComponent>(componente: Type<T>) {
  await TestBed.configureTestingModule({
    imports: [componente],
    providers: [
      ...proveedoresDePantalla(),
      provideAnimationsAsync(),
      { provide: BUSCADOR_CATEGORIA, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(componente);
  fixture.componentInstance.ngOnChanges();
  fixture.detectChanges();
  const formulario: DynamicFormComponent = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  const campos = (): string[] =>
    ['porcentaje', 'monto'].filter((id) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) !== null);
  const elegirTipo = (tipo: string): void => {
    formulario.form.get('tipo')?.setValue(tipo);
    fixture.detectChanges();
  };

  return { fixture, campos, elegirTipo };
}

describe('Porcentaje y monto separados (DAT-02b)', () => {
  it('la regla muestra solo el campo de su tipo', async () => {
    const { campos, elegirTipo } = await montar(ReglaPrecioFormComponent);

    expect(campos()).toEqual(['porcentaje']);
    elegirTipo('monto_fijo');
    expect(campos()).toEqual(['monto']);
    elegirTipo('nxm');
    expect(campos()).toEqual([]);
    elegirTipo('bundle');
    expect(campos()).toEqual([]);
  });

  it('la regla manda el campo de su tipo y el otro en null', async () => {
    const { fixture } = await montar(ReglaPrecioFormComponent);
    const emitidos: ReglaPrecioFormPayload[] = [];
    fixture.componentInstance.guardar.subscribe((p) => emitidos.push(p));

    fixture.componentInstance.onSubmit({ nombre: 'A', tipo: 'monto_fijo', porcentaje: 10, monto: 5 });
    fixture.componentInstance.onSubmit({ nombre: 'B', tipo: 'porcentaje', porcentaje: 12.5, monto: 5 });
    fixture.componentInstance.onSubmit({ nombre: 'C', tipo: 'nxm', porcentaje: 10, monto: 5, cantidad_compra: 3, cantidad_paga: 2 });

    expect(emitidos.map(({ porcentaje, monto }) => ({ porcentaje, monto }))).toEqual([
      { porcentaje: null, monto: 5 },
      { porcentaje: 12.5, monto: null },
      { porcentaje: null, monto: null },
    ]);
  });

  it('el cupon muestra solo el campo de su tipo', async () => {
    const { campos, elegirTipo } = await montar(CuponFormComponent);

    expect(campos()).toEqual(['porcentaje']);
    elegirTipo('monto_fijo');
    expect(campos()).toEqual(['monto']);
  });

  it('el cupon manda el campo de su tipo y el otro en null', async () => {
    const { fixture } = await montar(CuponFormComponent);
    const emitidos: CuponFormPayload[] = [];
    fixture.componentInstance.guardar.subscribe((p) => emitidos.push(p));

    fixture.componentInstance.onSubmit({ codigo: 'X', nombre: 'X', tipo: 'monto_fijo', porcentaje: 10, monto: 30 });
    fixture.componentInstance.onSubmit({ codigo: 'Y', nombre: 'Y', tipo: 'porcentaje', porcentaje: 15, monto: 30 });

    expect(emitidos.map(({ porcentaje, monto }) => ({ porcentaje, monto }))).toEqual([
      { porcentaje: null, monto: 30 },
      { porcentaje: 15, monto: null },
    ]);
  });

  it('el valor inicial llena el campo de su tipo', async () => {
    const { fixture, campos } = await montar(CuponFormComponent);
    fixture.componentRef.setInput('valorInicial', {
      id: 1, codigo: 'F', nombre: 'Fijo', tipo: 'monto_fijo', porcentaje: null, monto: '30.00',
      uso_maximo: null, uso_maximo_por_cliente: null, fecha_inicio: null, fecha_fin: null, activo: true,
    });
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();

    expect(campos()).toEqual(['monto']);
    expect(((fixture.nativeElement as HTMLElement).querySelector('#monto') as HTMLInputElement).value).toBe('30');
  });

  it('los cuerpos salen del contrato: porcentaje y monto opcionales', () => {
    const regla: CuerpoDe<'/reglas-precio', 'post'> = { nombre: 'R', tipo: 'nxm', aplica_a: 'todo' };
    const cupon: CuerpoDe<'/cupones', 'post'> = { codigo: 'C', nombre: 'C', tipo: 'monto_fijo', monto: 30, porcentaje: null };
    const desdeFormulario: CuerpoDe<'/cupones', 'post'> = { codigo: 'C', nombre: 'C', tipo: 'porcentaje', porcentaje: 10 } satisfies CuponFormPayload;

    expect([regla, cupon, desdeFormulario]).toHaveLength(3);
  });
});
