import type { RespuestaDe, UsuarioAdminResource } from '@nianva/api-contrato';

/**
 * Usuario tal como lo publica el contrato (UsuarioAdminResource, ARQ-12b). `sucursal` y `roles`
 * son opcionales porque el Resource los manda solo si la relacion viene cargada.
 */
export type UsuarioAdmin = UsuarioAdminResource;

export type UsuariosPermisos = RespuestaDe<'/usuarios', 'get'>['meta']['permisos'];

export interface UsuariosPagina {
  data: UsuarioAdmin[];
  total: number;
  permisos: UsuariosPermisos;
}
