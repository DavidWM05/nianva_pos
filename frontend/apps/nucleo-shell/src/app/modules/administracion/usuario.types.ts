/** Espejo de UsuarioAdminResource. */
export interface UsuarioAdmin {
  id: number;
  nombre: string;
  apellido: string | null;
  alias: string | null;
  correo: string;
  telefono: string | null;
  activo: boolean;
  ultimo_login: string | null;
  dos_factor_confirmado: boolean;
  sucursal: { id: number; nombre: string } | null;
  roles: { id: number; nombre: string }[];
}

export interface UsuariosPermisos {
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface UsuariosPagina {
  data: UsuarioAdmin[];
  total: number;
  permisos: UsuariosPermisos;
}
