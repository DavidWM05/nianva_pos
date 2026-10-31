/** Espejo de CategoriaResource. */
export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CategoriasPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface CategoriasPagina {
  data: Categoria[];
  total: number;
  permisos: CategoriasPermisos;
}
