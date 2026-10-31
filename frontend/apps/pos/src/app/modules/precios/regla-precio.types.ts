export type TipoReglaPrecio = 'porcentaje' | 'monto_fijo' | 'nxm' | 'bundle';
export type AplicaA = 'todo' | 'categoria' | 'producto' | 'variante';

/** Espejo de ReglaPrecioResource. */
export interface ReglaPrecio {
  id: number;
  nombre: string;
  tipo: TipoReglaPrecio;
  valor: string | null;
  cantidad_compra: number | null;
  cantidad_paga: number | null;
  precio_bundle: string | null;
  aplica_a: AplicaA;
  categoria: { id: number; nombre: string } | null;
  producto: { id: number; nombre: string } | null;
  variante: { id: number; talla: string | null; color: string | null; producto_nombre: string | null } | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
}

export interface ReglasPrecioPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface ReglasPrecioPagina {
  data: ReglaPrecio[];
  total: number;
  permisos: ReglasPrecioPermisos;
}
