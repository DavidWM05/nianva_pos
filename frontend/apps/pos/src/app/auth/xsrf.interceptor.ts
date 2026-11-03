import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { esUrlBackend } from '../core/api-config';

const COOKIE_XSRF = 'XSRF-TOKEN';
const HEADER_XSRF = 'X-XSRF-TOKEN';
const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Angular's built-in withXsrfConfiguration solo agrega el header
 * automaticamente en URLs relativas -- lo salta a proposito en URLs
 * absolutas (ver @angular/common/http/src/xsrf.ts: "Skip ... absolute
 * URLs", porque asume que una URL absoluta puede ser de otro origen y no
 * quiere filtrar el token). Como el backend vive en otro origen/puerto a
 * proposito, el interceptor de Angular nunca pone el header y Sanctum
 * responde 419 en cada POST. Este interceptor reemplaza esa pieza: lee la
 * cookie y pone el header a mano, solo para URLs de nuestro backend.
 */
export const xsrfInterceptor: HttpInterceptorFn = (req, next) => next(conTokenXsrf(req));

/**
 * Pone el header con el valor actual de la cookie. Tambien lo usa el
 * reintento ante 419 (csrf-retry.interceptor.ts), que necesita el token
 * recien renovado.
 */
export function conTokenXsrf<T>(req: HttpRequest<T>): HttpRequest<T> {
  if (!METODOS_MUTANTES.has(req.method) || !esUrlBackend(req.url)) {
    return req;
  }

  const token = leerCookie(COOKIE_XSRF);

  if (!token) {
    return req;
  }

  return req.clone({ setHeaders: { [HEADER_XSRF]: decodeURIComponent(token) } });
}

function leerCookie(nombre: string): string | null {
  const coincidencia = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));

  return coincidencia ? coincidencia[1] : null;
}
