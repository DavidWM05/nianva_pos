export type EstadoOrdenProduccion = 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';

export interface OrdenProduccionReceta {
  id: number;
  nombre: string;
}

/** OrdenProduccionResource (ajuste 9) -- ordenesIndex()/ordenesStore()/ordenesCambiarEstado() ya envuelven en Resource. */
export interface OrdenProduccion {
  folio?: string | null;
  /** DAT-08: ulid de la orden. */
  id: string;
  /** D-3, transitorio: número visible (= id interno); lo reemplaza el folio de DAT-07. */
  numero: number;
  cantidad_programada: string;
  cantidad_producida: string | null;
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
