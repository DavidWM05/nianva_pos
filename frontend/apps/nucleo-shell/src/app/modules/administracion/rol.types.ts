/** Espejo de RolResource. */
export interface Rol {
  id: number;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  usuarios_count?: number;
  /** Solo viaja en show()/store()/update() -- index() no carga la relacion completa. */
  permisos?: number[];
}

export interface RolesPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface RolesPagina {
  data: Rol[];
  total: number;
  permisos: RolesPermisos;
}
