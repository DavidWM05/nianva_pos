export type DataTableFilterType = 'text' | 'numeric' | 'date';

export interface DataTableColumn {
  field: string;
  header: string;
  sortable?: boolean;
  filterType?: DataTableFilterType;
  width?: string;
}

/**
 * Version simplificada del evento de PrimeNG (TableLazyLoadEvent) -- el
 * consumidor de nucleo-data-table no necesita conocer el tipo interno de
 * PrimeNG, solo estos 4 campos para pedirle la pagina/orden/filtro
 * correspondiente al backend.
 */
export interface DataTableLazyEvent {
  first: number;
  rows: number;
  sortField: string | null;
  sortOrder: number | null;
  filters: Record<string, { value: unknown; matchMode: string } | undefined>;
}
