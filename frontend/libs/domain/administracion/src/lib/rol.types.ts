import type { RespuestaDe, RolResource } from '@nianva/api-contrato';

/**
 * Rol tal como lo publica el contrato (RolResource, ARQ-12b). `permisos` (ids) solo viaja en
 * show()/store()/update(): index() no carga la relacion completa.
 */
export type Rol = RolResource;

export type RolesPermisos = RespuestaDe<'/roles', 'get'>['meta']['permisos'];

export interface RolesPagina {
  data: Rol[];
  total: number;
  permisos: RolesPermisos;
}
