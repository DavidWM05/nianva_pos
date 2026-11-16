import type { AtributoResource, CuerpoDe, RespuestaDe } from '@nianva/api-contrato';

/** Atributo genérico de variante tal como lo publica el contrato (ARQ-07). */
export type Atributo = AtributoResource;

/** Un valor del atributo; solo viaja en show() y en el listado con `con_valores`. */
export type AtributoValor = NonNullable<AtributoResource['valores']>[number];

export type AtributoPayload = CuerpoDe<'/atributos', 'post'>;

export type AtributoValorPayload = CuerpoDe<'/atributos/{atributo}/valores', 'post'>;

/** Detalle con los permisos de la vista de registro. */
export type AtributoDetalle = RespuestaDe<'/atributos/{atributo}', 'get'>;

/** Página del listado uniforme (API-06), con `total`, `page`, `rows`, filtros y permisos. */
export type AtributosPagina = Extract<RespuestaDe<'/atributos', 'get'>, { meta: unknown }>;
