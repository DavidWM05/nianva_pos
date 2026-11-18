import { LIMITES } from './limites';
import type { RutaApi } from './respuestas';

/** Límites de un campo del cuerpo de la petición, leídos del contrato (UI-11b). */
export interface LimiteCampo {
  readonly requerido: boolean;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  /** Decimales que acepta el campo (regla `decimal:0,N` del FormRequest). */
  readonly decimales?: number;
  /**
   * En un arreglo de objetos (las líneas de una venta, sus pagos), los límites de cada campo de un
   * elemento: `limitesDe('/ventas', 'post').items.elemento.cantidad.decimales`.
   */
  readonly elemento?: Readonly<Record<string, LimiteCampo>>;
}

type Limites = typeof LIMITES;

/** Ruta del contrato con algún cuerpo JSON (el mismo argumento que `CuerpoDe`). */
export type RutaConCuerpo = keyof Limites & RutaApi;

/** Método de la ruta que recibe cuerpo JSON. */
export type MetodoConCuerpo<R extends RutaConCuerpo> = keyof Limites[R];

/**
 * Límites por campo del cuerpo que acepta una ruta y método, como `CuerpoDe`:
 * `limitesDe('/categorias', 'post').nombre.maxLength`. No compila si la ruta o el método no
 * existen, ni si se pide un límite que el contrato no declara.
 */
export function limitesDe<R extends RutaConCuerpo, M extends MetodoConCuerpo<R>>(ruta: R, metodo: M): Limites[R][M] {
  const limites: Limites[R][M] | undefined = LIMITES[ruta]?.[metodo];
  if (limites === undefined) {
    // Solo llega aquí quien saltó el tipo (any, @ts-expect-error): mejor fallar que pintar sin límites.
    throw new Error(`El contrato no declara cuerpo para ${String(metodo).toUpperCase()} ${ruta}.`);
  }

  return limites;
}
