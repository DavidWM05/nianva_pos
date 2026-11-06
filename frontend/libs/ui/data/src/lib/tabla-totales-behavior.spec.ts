import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { ColumnaListado, MetaListado } from './listado.types';
import { TablaComponent } from './tabla.component';

interface Fila {
  nombre: string;
  ventas: number;
  piezas: number;
  margen: number;
}

const columnas: ColumnaListado<Fila>[] = [
  { tipo: 'principal', campo: 'nombre', encabezado: 'Producto' },
  { tipo: 'dinero', campo: 'ventas', encabezado: 'Ventas' },
  { tipo: 'cantidad', campo: 'piezas', encabezado: 'Piezas', unidad: 'pieza' },
  { tipo: 'porcentaje', campo: 'margen', encabezado: 'Margen' },
];

const filas: Fila[] = [
  { nombre: 'Playera', ventas: 1000, piezas: 2, margen: 10 },
  { nombre: 'Pantalon', ventas: 234.5, piezas: 1, margen: 5 },
];

const meta: MetaListado = {
  total: filas.length,
  page: 1,
  rows: 25,
  filtros_aplicados: {},
  permisos: {},
};

describe('TablaComponent totales', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function render(totales: Partial<Record<keyof Fila, number>> | null) {
    const fixture = TestBed.createComponent(TablaComponent<Fila>);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('filas', filas);
    fixture.componentRef.setInput('meta', meta);
    fixture.componentRef.setInput('totales', totales);
    fixture.detectChanges();

    return fixture;
  }

  it('pinta la fila de totales con el formato de cada columna', () => {
    const fixture = render({ ventas: 1234.5, piezas: 3, margen: 15 });
    const pie = fixture.nativeElement.querySelector('tfoot') as HTMLElement | null;

    expect(pie).not.toBeNull();
    expect(pie?.textContent).toContain('Total');
    expect(pie?.textContent).toContain('$1,234.50');
    expect(pie?.textContent).toContain('3 pieza');
    expect(pie?.textContent).toContain('15%');
  });

  it('no pinta fila de pie cuando no recibe totales', () => {
    const fixture = render(null);
    const pie = fixture.nativeElement.querySelector('tfoot') as HTMLElement | null;

    expect(pie?.querySelector('tr') ?? null).toBeNull();
  });
});
