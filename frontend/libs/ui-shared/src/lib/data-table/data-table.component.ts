import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ContentChildren, EventEmitter, Input, Output, QueryList } from '@angular/core';
import { SortableColumn, SortIcon, Table } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';

import { DataTableCellDirective } from './data-table-cell.directive';
import { DataTableColumn, DataTableLazyEvent } from './data-table.types';

/**
 * Tabla server-side generica: paginacion, orden y filtros los resuelve
 * quien consume el componente (emite lazyLoad y responde con [value] +
 * [totalRecords] actualizados) -- nucleo-data-table no sabe de donde
 * vienen los datos. Virtual scroll habilitado por defecto (pensado para
 * datasets grandes como kardex); se puede apagar con [virtualScroll]="false"
 * para listas cortas donde un paginador clasico es mas usable.
 *
 * Solo importa `Table` (el componente standalone), no `TableModule`
 * completo -- mismo criterio en todos los componentes de ui-shared: nunca
 * un import de "toda PrimeNG".
 */
@Component({
  selector: 'nucleo-data-table',
  standalone: true,
  imports: [CommonModule, Table, SortIcon, SortableColumn],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T = Record<string, unknown>> {
  @Input({ required: true }) columns: DataTableColumn[] = [];
  @Input() value: T[] = [];
  @Input() totalRecords = 0;
  @Input() loading = false;
  @Input() dataKey = 'id';
  @Input() rows = 25;
  @Input() rowsPerPageOptions = [25, 50, 100];
  @Input() virtualScroll = true;
  @Input() virtualScrollItemSize = 44;
  @Input() scrollHeight = '600px';
  @Input() emptyMessage = 'Sin resultados.';

  @Output() lazyLoad = new EventEmitter<DataTableLazyEvent>();

  @ContentChildren(DataTableCellDirective) private cellTemplates!: QueryList<DataTableCellDirective>;

  /** Usado desde la plantilla -- null si la columna no tiene celda custom, y el `#body` cae de vuelta a texto plano. */
  templateFor(field: string) {
    return this.cellTemplates?.find((t) => t.field === field)?.templateRef ?? null;
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.lazyLoad.emit({
      first: event.first ?? 0,
      rows: event.rows ?? this.rows,
      sortField: (event.sortField as string) ?? null,
      sortOrder: event.sortOrder ?? null,
      filters: (event.filters as DataTableLazyEvent['filters']) ?? {},
    });
  }
}

// re-exportado para que TableLazyLoadEvent no obligue a los consumidores
// a importar directamente de 'primeng/table' si solo necesitan el tipo.
export type { TableLazyLoadEvent };
