import type { RespuestaDe, RolResource } from '@nianva/api-contrato';

/** Espejo de RolResource. */
export interface Rol extends Omit<RolResource, 'permisos'> {
  /** Solo viaja en show()/store()/update() -- index() no carga la relacion completa. */
  permisos?: number[];
}

export type RolesPermisos = RespuestaDe<'/roles', 'get'>['meta']['permisos'];

export interface RolesPagina {
  data: Rol[];
  total: number;
  permisos: RolesPermisos;
}
