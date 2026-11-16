/**
 * Pagina, orden y filtros de un listado tal como los pide un servicio de domain/* (ARQ-12b).
 * Tiene la misma forma que el evento de la tabla de ui-shared (`DataTableLazyEvent`), asi que
 * una pantalla le pasa el evento tal cual, sin que el dominio dependa de la UI.
 */
export interface ConsultaPagina {
  first: number;
  rows: number;
  sortField: string | null;
  sortOrder: number | null;
  filters: Record<string, { value: unknown; matchMode: string } | undefined>;
}
