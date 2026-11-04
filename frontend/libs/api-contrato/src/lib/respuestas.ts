import type { paths } from './openapi';

/** Ruta del contrato, sin el prefijo /api/v1 (el mismo argumento que recibe urlApi). */
export type RutaApi = keyof paths;

type MetodoDe<R extends RutaApi> = {
  [M in keyof paths[R]]: paths[R][M] extends { responses: unknown } ? M : never;
}[keyof paths[R]];

type Exito<O> = O extends { responses: infer Rs }
  ? 200 extends keyof Rs
    ? Rs[200]
    : 201 extends keyof Rs
      ? Rs[201]
      : never
  : never;

type Json<C> = C extends { content: { 'application/json': infer T } } ? T : never;

/**
 * Cuerpo JSON de la respuesta exitosa (200, o 201 si no hay 200) de una ruta y metodo:
 * `http.get<RespuestaDe<'/gastos', 'get'>>(urlApi('/gastos'))`.
 */
export type RespuestaDe<R extends RutaApi, M extends MetodoDe<R>> = Json<Exito<paths[R][M]>>;

/** Cuerpo JSON que acepta una ruta y metodo, segun su FormRequest. */
export type CuerpoDe<R extends RutaApi, M extends MetodoDe<R>> = paths[R][M] extends {
  requestBody?: infer B;
}
  ? Json<NonNullable<B>>
  : never;
