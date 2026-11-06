import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectFiltroComponent, SelectFiltroOpcion } from './select-filtro/select-filtro.component';

type Interno = {
  opcionesConTodas: () => SelectFiltroOpcion[];
  valor: () => unknown;
  alCambiar: (valor: unknown) => void;
};

describe('SelectFiltroComponent comportamiento', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectFiltroComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(SelectFiltroComponent);
    fixture.componentRef.setInput('opciones', [
      { label: 'Activas', value: 'activas' },
      { label: 'Inactivas', value: 'inactivas' },
    ]);
    fixture.detectChanges();

    return fixture;
  }

  it('antepone Todas con valor null', () => {
    const fixture = render();

    expect((fixture.componentInstance as unknown as Interno).opcionesConTodas()).toEqual([
      { label: 'Todas', value: null },
      { label: 'Activas', value: 'activas' },
      { label: 'Inactivas', value: 'inactivas' },
    ]);
  });

  it('escribe un valor y emite null para Todas', () => {
    const fixture = render();
    const componente = fixture.componentInstance as unknown as Interno;
    const cambios = vi.fn();
    fixture.componentInstance.registerOnChange(cambios);

    fixture.componentInstance.writeValue('activas');
    fixture.detectChanges();
    expect(componente.valor()).toBe('activas');

    componente.alCambiar(null);
    expect(componente.valor()).toBeNull();
    expect(cambios).toHaveBeenLastCalledWith(null);
  });

  it('acepta valores sin opcion y los normaliza a null', () => {
    const fixture = render();
    const componente = fixture.componentInstance as unknown as Interno;

    fixture.componentInstance.writeValue(undefined);
    fixture.detectChanges();
    expect(componente.valor()).toBeNull();
  });
});
