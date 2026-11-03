import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectFiltroComponent, SelectFiltroOpcion } from './select-filtro.component';

describe('SelectFiltroComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectFiltroComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
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

  it('antepone la opcion Todas con valor null', () => {
    const fixture = render();
    const componente = fixture.componentInstance as unknown as {
      opcionesConTodas: () => SelectFiltroOpcion[];
    };

    expect(componente.opcionesConTodas()).toEqual([
      { label: 'Todas', value: null },
      { label: 'Activas', value: 'activas' },
      { label: 'Inactivas', value: 'inactivas' },
    ]);
  });

  it('escribe y emite null para Todas', () => {
    const fixture = render();
    const componente = fixture.componentInstance;
    const cambios = vi.fn();
    componente.registerOnChange(cambios);

    componente.writeValue('activas');
    fixture.detectChanges();

    expect((componente as unknown as { valor: () => unknown }).valor()).toBe('activas');

    (componente as unknown as { alCambiar: (valor: unknown) => void }).alCambiar(null);
    expect(cambios).toHaveBeenLastCalledWith(null);
  });
});
