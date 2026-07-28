/**
 * InsumoResource no expone el nombre de la unidad de medida, solo
 * unidad_medida_id -- como es un catalogo chico y sin paginar
 * (UnidadMedidaService.listar()), la UI resuelve el nombre armando un
 * mapa id->nombre en el propio frontend en vez de pedirle a backend un
 * campo mas (mismo catalogo que ya carga InsumoFormComponent para el
 * selector).
 */
export interface Insumo {
  id: number;
  nombre: string;
  sku: string | null;
  unidad_medida_id: number;
  costo: string | null;
  stock_minimo: string | null;
  activo: boolean;
}

export interface InsumoCrearPayload {
  nombre: string;
  sku?: string | null;
  unidad_medida_id: number;
  costo?: number;
  stock_minimo?: number;
}
