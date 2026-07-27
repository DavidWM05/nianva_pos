/** Espejo de DepartamentoResource. */
export interface Departamento {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface DepartamentosPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface DepartamentosPagina {
  data: Departamento[];
  total: number;
  permisos: DepartamentosPermisos;
}
