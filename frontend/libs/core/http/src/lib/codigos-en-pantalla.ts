import { HttpContextToken } from '@angular/common/http';

/**
 * Codigos de negocio que la pantalla maneja con su propio mensaje: el interceptor no muestra
 * esos, y si los demas y los tecnicos. Mas estrecho que ERROR_EN_PANTALLA, que lo calla todo.
 *
 * Son `string` y no `CodigoError`: el catalogo generado vive en @nianva/ui-shared y una lib
 * `type:core` no depende de otras libs. Cada servicio que marca codigos tiene su spec con el
 * codigo exacto (`codigos-en-pantalla-marcas.spec.ts`).
 */
export const CODIGOS_EN_PANTALLA = new HttpContextToken<readonly string[]>(() => []);
