import type { CuerpoDe, PerfilGiroResource, RespuestaDe } from '@nianva/api-contrato';

/** Perfil de giro (datos del backend) tal como lo publica el contrato (ARQ-07). */
export type PerfilGiro = PerfilGiroResource;

export type ClavePerfilGiro = CuerpoDe<'/configuracion/perfil-giro', 'put'>['perfil'];

/** Catálogo de perfiles con la clave del perfil actual del tenant en `meta.actual`. */
export type CatalogoPerfilesGiro = RespuestaDe<'/perfiles-giro', 'get'>;

/** Respuesta de aplicar un perfil: el perfil, la clave actual y cuánto se sembró. */
export type PerfilGiroAplicado = RespuestaDe<'/configuracion/perfil-giro', 'put'>;
