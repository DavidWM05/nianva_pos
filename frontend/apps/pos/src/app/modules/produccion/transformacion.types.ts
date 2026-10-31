/** TransformacionResource (ajuste 9) -- transformacionStore()/transformacionesIndex() ya envuelven en Resource. */
export interface TransformacionProducto {
  id: number;
  variante_origen_id: number;
  variante_destino_id: number;
  cantidad_origen: string;
  cantidad_destino: string;
  notas: string | null;
}

export interface TransformacionCrearPayload {
  variante_origen_id: number;
  variante_destino_id: number;
  cantidad_origen: number;
  cantidad_destino: number;
  notas?: string | null;
}
