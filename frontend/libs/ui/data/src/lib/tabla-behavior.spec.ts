import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TablaComponent } from './tabla.component';
import { ColumnaListado, MetaListado } from './listado.types';

interface Fila {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  existencias: number;
  descuento: number;
  fecha: string;
  creadoEn: string;
  estado: string;
  activo: boolean;
}

const columnas: ColumnaListado<Fila>[] = [
  { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', apoyo: 'categoria', ordenable: true },
  { tipo: 'dinero', campo: 'precio', encabezado: 'Precio', ordenable: true },
  { tipo: 'cantidad', campo: 'existencias', encabezado: 'Existencias', unidad: 'pieza' },
  { tipo: 'porcentaje', campo: 'descuento', encabezado: 'Descuento' },
  { tipo: 'fecha', campo: 'fecha', encabezado: 'Fecha' },
  { tipo: 'fechaHora', campo: 'creadoEn', encabezado: 'Creado' },
  { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'venta' },
  {
    tipo: 'acciones',
    campo: 'id',
    encabezado: '',
    acciones: (fila) => [{ tipo: 'ver' }, { tipo: 'estado', activo: fila.activo }],
  },
];

const filas: Fila[] = [
  {
    id: 1,
    nombre: 'Playera',
    categoria: 'Ropa',
    precio: 1234.5,
    existencias: 3,
    descuento: 15,
    fecha: '2026-11-03',
    creadoEn: '2026-11-03T15:30:00.000Z',
    estado: 'anulada',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Pantalon',
    categoria: 'Ropa',
    precio: -80,
    existencias: 1,
    descuento: 0,
    fecha: '2026-11-02',
    creadoEn: '2026-11-02T10:00:00.000Z',
    estado: 'completada',
    activo: false,
  },
];

const meta: MetaListado = {
  total: 2,
  page: 1,
  rows: 25,
  filtros_aplicados: {},
  permisos: {},
};

describe('TablaComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablaComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function render(cargando = false, datos: Fila[] = filas, metaActual = meta) {
    const fixture = TestBed.createComponent(TablaComponent<Fila>);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('filas', datos);
    fixture.componentRef.setInput('meta', metaActual);
    fixture.componentRef.setInput('cargando', cargando);
    fixture.componentRef.setInput('filaInactiva', (fila: Fila) => ! fila.activo);
    fixture.detectChanges();

    return fixture;
  }

  it('renderiza header y celdas con el formato de ui/format', () => {
    const fixture = render();
    const texto = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');

    expect(texto).toContain('Nombre');
    expect(texto).toContain('Playera');
    expect(texto).toContain('Ropa');
    expect(texto).toContain('$1,234.50');
    expect(texto).toContain('3 pieza');
    expect(texto).toContain('15%');
    expect(texto).toContain('03/11/2026');
    expect(texto).toContain('03/11/2026 09:30');
  });

  it('alinea numeros y pinta en peligro los negativos', () => {
    const fixture = render();
    const negativos = (fixture.nativeElement as HTMLElement).querySelectorAll('.ui-tabla__numero--peligro');
    const numeros = (fixture.nativeElement as HTMLElement).querySelectorAll('.ui-tabla__numero');

    expect(negativos).toHaveLength(1);
    expect(numeros.length).toBeGreaterThan(0);
    expect([...numeros].every((numero) => numero.classList.contains('ui-tabla__numero'))).toBe(true);
  });

  it('usa badge para el estado y la fila inactiva', () => {
    const fixture = render();
    const texto = (fixture.nativeElement.textContent ?? '').replace(/\s+/g, ' ');

    expect(texto).toContain('Anulada');
    expect(texto).toContain('Inactivo');
    expect((fixture.nativeElement as HTMLElement).querySelector('.ui-tabla__fila--inactiva')).not.toBeNull();
  });

  it('las acciones se calculan por fila', () => {
    const fixture = render();
    const titulos = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.ui-row-actions__accion')]
      .map((boton) => boton.getAttribute('title'));

    expect(titulos).toEqual(['Ver', 'Desactivar', 'Ver', 'Activar']);
  });

  it('el estado normal de la entidad no pinta badge', () => {
    const fixture = render();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('ui-badge .ui-badge')).toHaveLength(1);
  });

  it('emite la accion de fila con la fila original', () => {
    const fixture = render();
    const emitir = vi.fn();
    fixture.componentInstance.accion.subscribe(emitir);

    (fixture.nativeElement.querySelector('.ui-row-actions__accion') as HTMLButtonElement).click();

    expect(emitir).toHaveBeenCalledWith({ fila: filas[0], accion: { tipo: 'ver' } });
  });

  it('muestra skeleton en la primera carga, sin texto Cargando', () => {
    const fixture = render(true, [], { ...meta, rows: 3, total: 0 });

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.ui-tabla__skeleton-fila')).toHaveLength(3);
    expect(fixture.nativeElement.textContent ?? '').not.toContain('Cargando');
  });

  it('mantiene los datos durante una recarga', () => {
    const fixture = render(true);

    expect(fixture.nativeElement.textContent ?? '').toContain('Playera');
    expect((fixture.nativeElement as HTMLElement).querySelector('.ui-tabla__skeleton')).toBeNull();
  });

  it('muestra ui-empty cuando no hay filas y no esta cargando', () => {
    const fixture = render(false, []);
    fixture.componentRef.setInput('mensajeVacio', 'Sin ventas.');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ui-empty')).not.toBeNull();
    expect(fixture.nativeElement.textContent ?? '').toContain('Sin ventas.');
  });

  it('mapea el orden a CambioListado y vuelve a la primera pagina', () => {
    const fixture = render();
    const cambios: Array<{ page: number; rows: number; sortField: string | null; sortOrder: string | null }> = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));
    const encabezado = [...(fixture.nativeElement as HTMLElement).querySelectorAll('th')].find((th) =>
      th.textContent?.includes('Nombre'),
    ) as HTMLTableCellElement;

    encabezado.click();
    fixture.detectChanges();

    expect(cambios.at(-1)).toEqual({ page: 1, rows: 25, sortField: 'nombre', sortOrder: 'asc' });
  });
});
