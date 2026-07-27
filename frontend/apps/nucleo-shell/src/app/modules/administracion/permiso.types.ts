/** Espejo de PermisoController::index(). Catalogo fijo, sembrado por NucleoRolesPermisosSeeder. */
export interface Permiso {
  id: number;
  modulo: string;
  accion: string;
  nombre: string;
  descripcion: string | null;
}

export interface GrupoPermisos {
  modulo: string;
  permisos: Permiso[];
}
