import type { RespuestaDe } from '@nianva/api-contrato';

/** Espejo de PermisoController::index(). Catalogo fijo, sembrado por NucleoRolesPermisosSeeder. */
export type Permiso = Pick<
  RespuestaDe<'/permisos', 'get'>['data'][number],
  'id' | 'modulo' | 'accion' | 'nombre' | 'descripcion'
>;

export interface GrupoPermisos {
  modulo: string;
  permisos: Permiso[];
}
