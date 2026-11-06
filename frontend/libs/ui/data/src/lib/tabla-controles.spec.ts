import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { ColumnaListado, MetaListado } from './listado.types';
import { TablaComponent } from './tabla.component';

// 49g: con mat-paginator desaparecieron los botones de primera y ultima pagina que tenia
// p-paginator, y matSort describia cada encabezado ordenable como "Sort", en ingles.
interface Fila {
  id: number;
  nombre: string;
}

const columnas: ColumnaListado<Fila>[] = [{ tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true }];
const meta: MetaListado = { total: 100, page: 2, rows: 25, filtros_aplicados: {}, permisos: {} };

describe('TablaComponent controles de paginacion y orden', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(TablaComponent<Fila>);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('filas', [{ id: 1, nombre: 'Playera' }]);
    fixture.componentRef.setInput('meta', meta);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('el paginador tiene primera, anterior, siguiente y ultima pagina', () => {
    const etiquetas = [...render().querySelectorAll('mat-paginator button')].map((boton) => boton.getAttribute('aria-label'));

    expect(etiquetas).toEqual(['Primera página', 'Página anterior', 'Página siguiente', 'Última página']);
  });

  it('cada encabezado ordenable se describe en español con su columna', () => {
    const el = render();
    const boton = el.querySelector('.mat-sort-header-container') as HTMLElement;
    const descripcion = document.getElementById(boton.getAttribute('aria-describedby') ?? '')?.textContent?.trim();

    expect(descripcion).toBe('Ordenar por Nombre');
  });
});
