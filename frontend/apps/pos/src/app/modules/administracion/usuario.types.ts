import type { RespuestaDe, UsuarioAdminResource } from '@nianva/api-contrato';

/** Espejo de UsuarioAdminResource. */
export interface UsuarioAdmin extends Omit<UsuarioAdminResource, 'sucursal' | 'roles'> {
  sucursal: NonNullable<UsuarioAdminResource['sucursal']> | null;
  roles: NonNullable<UsuarioAdminResource['roles']>;
}

export type UsuariosPermisos = RespuestaDe<'/usuarios', 'get'>['meta']['permisos'];

export interface UsuariosPagina {
  data: UsuarioAdmin[];
  total: number;
  permisos: UsuariosPermisos;
}
