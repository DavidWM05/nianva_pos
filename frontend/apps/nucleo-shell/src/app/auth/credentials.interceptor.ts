import { HttpInterceptorFn } from '@angular/common/http';

/**
 * withCredentials:true en TODA request -- necesario para que el navegador
 * mande/reciba la cookie de sesion httpOnly de Sanctum en peticiones
 * cross-origin (frontend y backend en puertos distintos). Centralizado
 * aqui para que ningun call site tenga que acordarse de ponerlo.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};
