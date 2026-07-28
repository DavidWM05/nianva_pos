import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntidadSelectorComponent } from './entidad-selector.component';
import { BuscadorDeHijos, BuscadorEntidad, EntidadBuscable } from './entidad-selector.types';

describe('EntidadSelectorComponent', () => {
  let fixture: ComponentFixture<EntidadSelectorComponent>;
  let component: EntidadSelectorComponent;
  let buscador: BuscadorEntidad;
  let buscadorHijos: BuscadorDeHijos;

  const entidad: EntidadBuscable = { id: 1, nombre: 'Producto uno' };
  const hijos: EntidadBuscable[] = [{ id: 10, nombre: 'Chica / Roja' }];

  beforeEach(async () => {
    buscador = {
      buscar: vi.fn().mockReturnValue(of([entidad])),
      obtener: vi.fn().mockReturnValue(of(entidad)),
    };
    buscadorHijos = { hijosDe: vi.fn().mockReturnValue(of(hijos)) };

    await TestBed.configureTestingModule({
      imports: [EntidadSelectorComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    fixture = TestBed.createComponent(EntidadSelectorComponent);
    component = fixture.componentInstance;
    component.buscador = buscador;
  });

  it('busca a traves del buscador inyectado por @Input, sin conocer su implementacion', () => {
    component.ngOnChanges();
    fixture.detectChanges();

    component.buscar({ query: 'prod', originalEvent: new Event('input') });

    expect(buscador.buscar).toHaveBeenCalledWith('prod');
  });

  it('sin buscadorHijos, seleccionar la entidad no consulta hijos', () => {
    component.ngOnChanges();
    fixture.detectChanges();

    component.onSeleccionar(entidad);

    expect(component['hijos']()).toEqual([]);
  });

  it('con buscadorHijos, seleccionar la entidad carga y emite sus hijos', () => {
    component.buscadorHijos = buscadorHijos;
    component.ngOnChanges();
    fixture.detectChanges();

    let hijoEmitido: number | null | undefined;
    component.hijoSeleccionado.subscribe((v) => (hijoEmitido = v));

    component.onSeleccionar(entidad);

    expect(buscadorHijos.hijosDe).toHaveBeenCalledWith(entidad.id);
    expect(component['hijos']()).toEqual(hijos);
    expect(hijoEmitido).toBeNull();
  });

  it('focus() mueve el foco al input de busqueda del autocomplete', () => {
    component.ngOnChanges();
    fixture.detectChanges();

    component.focus();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(document.activeElement).toBe(input);
  });

  it('con valorInicial, resuelve la entidad y sus hijos via el buscador', () => {
    component.buscadorHijos = buscadorHijos;
    component.valorInicial = entidad.id;
    component.valorInicialHijo = hijos[0].id;
    component.ngOnChanges();
    fixture.detectChanges();

    expect(buscador.obtener).toHaveBeenCalledWith(entidad.id);
    expect(buscadorHijos.hijosDe).toHaveBeenCalledWith(entidad.id);
    expect(component['hijoElegidoId']).toBe(hijos[0].id);
  });
});
