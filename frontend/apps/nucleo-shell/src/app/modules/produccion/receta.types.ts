/**
 * RecetaResource devuelve `ingredientes` via whenLoaded('ingredientes')
 * sin envolverlos en un Resource propio -- son modelos RecetaIngrediente
 * crudos (id, receta_id, insumo_id, cantidad, unidad_medida_id), sin
 * nombre de insumo/unidad. La UI muestra "Insumo #id" / "Unidad #id".
 */
export interface RecetaIngredienteCrudo {
  id: number;
  insumo_id: number;
  cantidad: string;
  unidad_medida_id: number;
}

export interface Receta {
  id: number;
  variante_id: number;
  nombre: string;
  descripcion: string | null;
  instrucciones: string | null;
  rendimiento: string;
  /** Solo viaja si el backend la cargo (siempre en index(), ver ProduccionController::recetasIndex()). */
  ingredientes?: RecetaIngredienteCrudo[];
}

export interface RecetaIngredientePayload {
  insumo_id: number;
  cantidad: number;
  unidad_medida_id: number;
}

export interface RecetaCrearPayload {
  variante_id: number;
  nombre: string;
  rendimiento?: number;
  instrucciones?: string | null;
  descripcion?: string | null;
  ingredientes: RecetaIngredientePayload[];
}
