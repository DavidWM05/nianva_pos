import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilterBarComponent } from './filter-bar.component';
import { MetaListado } from './listado.types';

const meta: MetaListado = {
  total: 1234,
  page: 2,
  rows: 25,
  filtros_aplicados: {},
  permisos: {},
};

describe('FilterBarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FilterBarComponent] });
  });

  function render(conFiltros = false) {
    const fixture = TestBed.createComponent(FilterBarComponent);
    fixture.componentRef.setInput('meta', meta);
    fixture.componentRef.setInput('hayFiltros', conFiltros);
    fixture.detectChanges();

    return fixture;
  }

  it('muestra el rango actual y el total con separador de miles', () => {
    const fixture = render();
    const texto = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();

    expect(texto).toContain('Mostrando 26–50 de 1,234');
  });

  it('solo muestra Limpiar cuando hay filtros', () => {
    const sinFiltros = render(false);
    const conFiltros = render(true);

    expect(sinFiltros.nativeElement.querySelector('button')).toBeNull();
    expect(conFiltros.nativeElement.querySelector('button')?.textContent).toContain('Limpiar');
  });

  it('emite limpiar al pulsar el boton', () => {
    const fixture = render(true);
    const emitir = vi.fn();
    fixture.componentInstance.limpiar.subscribe(emitir);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitir).toHaveBeenCalledOnce();
  });

  it('muestra cero cuando no hay resultados', () => {
    const fixture = TestBed.createComponent(FilterBarComponent);
    fixture.componentRef.setInput('meta', { ...meta, total: 0, page: 1 });
    fixture.detectChanges();

    const texto = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(texto).toContain('Mostrando 0–0 de 0');
  });
});
