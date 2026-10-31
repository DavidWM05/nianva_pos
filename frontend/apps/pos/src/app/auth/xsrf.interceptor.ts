import { HttpInterceptorFn } from '@angular/common/http';
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
export const xsrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (!METODOS_MUTANTES.has(req.method) || !esUrlBackend(req.url)) {
    return next(req);
  }

  const token = leerCookie(COOKIE_XSRF);

  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { [HEADER_XSRF]: decodeURIComponent(token) } }));
};

function leerCookie(nombre: string): string | null {
  const coincidencia = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));

  return coincidencia ? coincidencia[1] : null;
}
