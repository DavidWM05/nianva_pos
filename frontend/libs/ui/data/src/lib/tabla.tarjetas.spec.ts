import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { PantallaService } from '@nianva/ui-layout';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ColumnaListado, MetaListado } from './listado.types';
import { TablaComponent } from './tabla.component';

interface Fila {
  nombre: string;
  total: number;
  estado: string;
  activo: boolean;
}

const columnas: ColumnaListado<Fila>[] = [
  { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre' },
  { tipo: 'dinero', campo: 'total', encabezado: 'Total' },
  { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'venta' },
  { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] },
];

const filas: Fila[] = [
  { nombre: 'Playera', total: 1250.5, estado: 'anulada', activo: false },
  { nombre: 'Pantalón', total: 80, estado: 'completada', activo: true },
];

const meta: MetaListado = { total: 2, page: 1, rows: 25, filtros_aplicados: {}, permisos: {} };
const angosta = signal(false);

describe('TablaComponent en tarjetas', () => {
  beforeEach(async () => {
    angosta.set(false);
    await TestBed.configureTestingModule({
      imports: [TablaComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } },
      ],
    }).compileComponents();
  });

  function render(cargando = false) {
    const fixture = TestBed.createComponent(TablaComponent<Fila>);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('filas', cargando ? [] : filas);
    fixture.componentRef.setInput('meta', meta);
    fixture.componentRef.setInput('cargando', cargando);
    fixture.componentRef.setInput('filaInactiva', (fila: Fila) => !fila.activo);
    fixture.componentRef.setInput('totales', { total: 1330.5 });
    fixture.detectChanges();

    return fixture;
  }

  it('en pantalla angosta pinta una tarjeta por fila con título y pares etiqueta-valor', () => {
    angosta.set(true);
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.ui-tabla__tarjeta')).toHaveLength(2);
    expect(el.textContent).toContain('Playera');
    expect(el.textContent).toContain('Total');
    expect(el.textContent).toContain('$1,250.50');
  });

  it('mantiene acciones, fila inactiva y tarjeta de totales', () => {
    angosta.set(true);
    const fixture = render();
    const emitir = vi.fn();
    fixture.componentInstance.accion.subscribe(emitir);

    expect(fixture.nativeElement.querySelector('.ui-tabla__tarjeta--inactiva')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.ui-tabla__total-tarjeta')?.textContent).toContain('Total');

    (fixture.nativeElement.querySelector('.ui-row-actions__accion') as HTMLButtonElement).click();

    expect(emitir).toHaveBeenCalledWith({ fila: filas[0], accion: { tipo: 'ver' } });
  });

  it('en pantalla angosta muestra un skeleton con forma de tarjeta', () => {
    angosta.set(true);
    const fixture = render(true);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.ui-tabla__tarjeta-skeleton').length).toBeGreaterThan(0);
    expect(el.textContent).not.toContain('Cargando');
  });

  it('desde md no pinta tarjetas', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelector('.ui-tabla__tarjeta')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-table')).not.toBeNull();
  });
});
