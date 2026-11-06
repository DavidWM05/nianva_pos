import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { CambioListado, ColumnaListado, MetaListado } from './listado.types';
import { TablaComponent } from './tabla.component';

// 49g: el caso retirado "mapea el evento lazy a CambioListado" cubria la conversion de
// posicion a pagina (fila 50 con 25 por pagina -> pagina 3) y el orden descendente. MatPaginator
// cuenta las paginas desde 0 y CambioListado desde 1: aqui se prueba esa frontera.
interface Fila {
  id: number;
  nombre: string;
}

const columnas: ColumnaListado<Fila>[] = [{ tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true }];

const filas: Fila[] = [
  { id: 1, nombre: 'Playera' },
  { id: 2, nombre: 'Pantalon' },
];

function meta(page: number): MetaListado {
  return { total: 100, page, rows: 25, filtros_aplicados: {}, permisos: {} };
}

describe('TablaComponent paginacion y orden', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function render(page: number) {
    const fixture = TestBed.createComponent(TablaComponent<Fila>);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('meta', meta(page));
    fixture.detectChanges();
    const cambios: CambioListado[] = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));

    return { fixture, cambios, el: fixture.nativeElement as HTMLElement };
  }

  it('muestra la pagina que llega en meta, contando desde 1', () => {
    const { el } = render(3);

    expect(el.querySelector('.mat-mdc-paginator-range-label')?.textContent?.trim()).toBe('51–75 de 100');
  });

  it('la pagina siguiente emite el numero de pagina contando desde 1', () => {
    const { fixture, cambios, el } = render(3);

    (el.querySelector('button[aria-label="Página siguiente"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(cambios.at(-1)).toMatchObject({ page: 4, rows: 25 });
  });

  it('ordenar dos veces la misma columna emite el orden descendente en la pagina 1', () => {
    const { fixture, cambios, el } = render(3);
    const encabezado = [...el.querySelectorAll('th')].find((th) => th.textContent?.includes('Nombre')) as HTMLElement;
    const boton = (encabezado.querySelector('.mat-sort-header-container') as HTMLElement | null) ?? encabezado;

    boton.click();
    fixture.detectChanges();
    boton.click();
    fixture.detectChanges();

    expect(cambios.at(-1)).toEqual({ page: 1, rows: 25, sortField: 'nombre', sortOrder: 'desc' });
  });
});
