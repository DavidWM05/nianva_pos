import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStateService } from './auth-state.service';

/**
 * Protege el shell completo (ver app.routes.ts: se aplica al padre que
 * envuelve ShellLayoutComponent, no ruta por ruta). Sin sesion -> /login.
 * Con sesion pero 2FA obligatorio sin confirmar -> /two-factor/setup,
 * nunca se llega a ver el sidebar en ese estado intermedio.
 */
export const authGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (!authState.autenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (authState.requiereConfigurarDosFactor()) {
    return router.createUrlTree(['/two-factor/setup']);
  }

  return true;
};

/**
 * Para /two-factor/setup: exige sesion iniciada (un admin al que le falta
 * configurar 2FA SI tiene sesion, a diferencia de un invitado), pero NO
 * exige que el 2FA ya este confirmado -- si usara authGuard, un admin sin
 * 2FA nunca podria llegar a esta misma ruta (redirect en bucle).
 */
export const requiereSesionGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  return authState.autenticado() ? true : router.createUrlTree(['/login']);
};
