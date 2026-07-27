import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it } from 'vitest';

import { DataTableCellDirective } from './data-table-cell.directive';
import { DataTableComponent } from './data-table.component';
import { DataTableColumn } from './data-table.types';

interface Fila {
  id: number;
  nombre: string;
  stock: number;
}

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableComponent<Fila>>;
  let component: DataTableComponent<Fila>;

  const columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre', sortable: true },
    { field: 'stock', header: 'Stock' },
  ];

  const filas: Fila[] = [
    { id: 1, nombre: 'Playera', stock: 18 },
    { id: 2, nombre: 'Pantalón', stock: 7 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTableComponent<Fila>);
    component = fixture.componentInstance;
    component.columns = columns;
    component.value = filas;
    component.totalRecords = filas.length;
    component.virtualScroll = false;
    fixture.detectChanges();
  });

  it('renderiza el header con las columnas configuradas', () => {
    const headerText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(headerText).toContain('Nombre');
    expect(headerText).toContain('Stock');
  });

  it('renderiza los datos de cada fila', () => {
    const bodyText = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(bodyText).toContain('Playera');
    expect(bodyText).toContain('Pantalón');
    expect(bodyText).toContain('18');
    expect(bodyText).toContain('7');
  });

  it('mapea el evento lazy de PrimeNG a DataTableLazyEvent con los campos esperados', () => {
    let emitted: unknown;
    component.lazyLoad.subscribe((event) => (emitted = event));

    component.onLazyLoad({
      first: 25,
      rows: 25,
      sortField: 'nombre',
      sortOrder: -1,
      filters: { nombre: { value: 'play', matchMode: 'contains' } },
    });

    expect(emitted).toEqual({
      first: 25,
      rows: 25,
      sortField: 'nombre',
      sortOrder: -1,
      filters: { nombre: { value: 'play', matchMode: 'contains' } },
    });
  });

  it('usa valores por defecto cuando el evento lazy de PrimeNG no trae sort/filtros', () => {
    let emitted: unknown;
    component.lazyLoad.subscribe((event) => (emitted = event));

    component.onLazyLoad({ first: 0, rows: 25 });

    expect(emitted).toEqual({
      first: 0,
      rows: 25,
      sortField: null,
      sortOrder: null,
      filters: {},
    });
  });
});

@Component({
  standalone: true,
  imports: [DataTableComponent, DataTableCellDirective],
  template: `
    <nucleo-data-table [columns]="columns" [value]="filas" [totalRecords]="filas.length" [virtualScroll]="false">
      <ng-template nucleoDataTableCell="stock" let-row>
        <span class="stock-custom">{{ row.stock }} unidades</span>
      </ng-template>
    </nucleo-data-table>
  `,
})
class HostConCeldaCustomComponent {
  columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre' },
    { field: 'stock', header: 'Stock' },
  ];

  filas: Fila[] = [{ id: 1, nombre: 'Playera', stock: 18 }];
}

describe('DataTableComponent con celda custom (nucleoDataTableCell)', () => {
  it('renderiza el template proyectado en la columna marcada, y texto plano en el resto', async () => {
    await TestBed.configureTestingModule({
      imports: [HostConCeldaCustomComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();

    const fixture = TestBed.createComponent(HostConCeldaCustomComponent);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Playera');
    expect(texto).toContain('18 unidades');
    expect(fixture.nativeElement.querySelector('.stock-custom')).not.toBeNull();
  });
});
