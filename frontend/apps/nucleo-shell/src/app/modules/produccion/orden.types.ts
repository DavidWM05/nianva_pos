export type EstadoOrdenProduccion = 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';

export interface OrdenProduccionReceta {
  id: number;
  nombre: string;
}

/** OrdenProduccionResource (ajuste 9) -- ordenesIndex()/ordenesStore()/ordenesCambiarEstado() ya envuelven en Resource. */
export interface OrdenProduccion {
  id: number;
  cantidad_programada: number;
  cantidad_producida: number | null;
  estado: EstadoOrdenProduccion;
  notas: string | null;
  fecha_programada: string | null;
  fecha_completada: string | null;
  /** whenLoaded('receta') -- ProduccionController siempre carga la receta antes de paginar/crear, asi que en la practica siempre viaja. */
  receta?: OrdenProduccionReceta;
}

export interface OrdenProduccionCrearPayload {
  receta_id: number;
  cantidad_programada: number;
  fecha_programada?: string | null;
  notas?: string | null;
}
