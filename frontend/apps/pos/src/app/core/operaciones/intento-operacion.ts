import { generarLlaveIdempotencia } from '@nianva/core-http';
import { Observable, defer, tap } from 'rxjs';

/**
 * Un intento de una operacion de dinero (API-07). Guarda la `Idempotency-Key` y, si hizo falta,
 * el token del supervisor (SEG-05) del cuerpo que se esta enviando:
 * - si el envio falla sin confirmar (red, 5xx, un rechazo), el siguiente envio del mismo cuerpo
 *   reusa la llave: si el servidor si lo registro, responde lo mismo sin duplicarlo;
 * - si el cuerpo cambia (otro carrito, otro descuento), la llave es nueva y el token se descarta,
 *   porque el supervisor autorizo el cuerpo anterior;
 * - tras confirmar, el siguiente envio es otra operacion y lleva llave nueva.
 *
 * Una instancia por formulario o accion de la pantalla.
 */
export class IntentoOperacion {
  private firma: string | null = null;
  private llaveActual: string | null = null;
  private tokenActual: string | undefined;

  /** Prepara el envio de `cuerpo` y devuelve la llave que le toca. */
  preparar(cuerpo: unknown): string {
    const firma = firmaCanonica(cuerpo);

    if (this.llaveActual === null || firma !== this.firma) {
      this.firma = firma;
      this.llaveActual = generarLlaveIdempotencia();
      this.tokenActual = undefined;
    }

    return this.llaveActual;
  }

  get token(): string | undefined {
    return this.tokenActual;
  }

  /** El token del supervisor para el cuerpo preparado. */
  autorizar(token: string): void {
    this.tokenActual = token;
  }

  /** El servidor confirmo la operacion: el siguiente envio es otra. */
  confirmar(): void {
    this.firma = null;
    this.llaveActual = null;
    this.tokenActual = undefined;
  }

  /** Prepara `cuerpo`, envia con su llave y confirma si el servidor responde con exito. */
  ejecutar<T>(cuerpo: unknown, operacion: (llave: string) => Observable<T>): Observable<T> {
    return defer(() => operacion(this.preparar(cuerpo))).pipe(tap(() => this.confirmar()));
  }
}

/** JSON con las claves de cada objeto ordenadas: el mismo cuerpo da la misma firma. */
function firmaCanonica(valor: unknown): string {
  return JSON.stringify(valor, (_clave, actual: unknown) =>
    actual !== null && typeof actual === 'object' && !Array.isArray(actual)
      ? Object.fromEntries(Object.entries(actual).sort(([a], [b]) => a.localeCompare(b)))
      : actual,
  );
}
