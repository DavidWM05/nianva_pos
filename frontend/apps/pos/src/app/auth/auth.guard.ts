import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import { SesionActualService } from '@nianva/domain-sesion';

import { ITEM_FUNCION_NO_INCLUIDA, entradaDeRuta } from '../modules/modules.config';

import { AuthStateService } from './auth-state.service';
import { BloqueoSesionService } from './bloqueo-sesion.service';

/**
 * Protege el shell completo (ver app.routes.ts: se aplica al padre que
 * envuelve ShellLayoutComponent, no ruta por ruta). Sin sesion -> /login.
 * Con sesion pero 2FA obligatorio sin confirmar -> /two-factor/setup,
 * nunca se llega a ver el sidebar en ese estado intermedio.
 */
export const authGuard: CanActivateFn = () => {
  const bloqueo = inject(BloqueoSesionService);
  const authState = inject(AuthStateService);
  const router = inject(Router);

  // SEG-12: con la sesion bloqueada (tambien al recargar) se espera al desbloqueo, que recarga la
  // sesion, y se decide despues; mandar al login perderia una sesion que sigue viva.
  if (bloqueo.activa()) {
    return bloqueo.esperarDesbloqueo().then(() => decidir(authState, router));
  }

  return decidir(authState, router);
};

/** Comprueba capacidades antes de que se activen los hijos del shell. */
export const capacidadGuard: CanActivateChildFn = (_ruta, estado) => {
  const router = inject(Router);
  const sesion = inject(SesionActualService);
  const ruta = router.parseUrl(estado.url).root.children[PRIMARY_OUTLET]?.segments.map((parte) => parte.path).join('/') ?? '';
  const entrada = entradaDeRuta(ruta);
  if (!entrada) return true;

  const motivo = sesion.motivoNoDisponible(entrada.permiso, entrada.modulo, entrada.concesion, entrada.admiteSesionCentral);
  // Un permiso ausente conserva el manejo de acceso denegado de la pantalla y su API.
  if (motivo === null || motivo === 'permiso') return true;

  return router.createUrlTree(['/', ITEM_FUNCION_NO_INCLUIDA.path], { queryParams: { funcion: entrada.key, motivo } });
};

function decidir(authState: AuthStateService, router: Router): boolean | UrlTree {
  if (!authState.autenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (authState.requiereConfigurarDosFactor()) {
    return router.createUrlTree(['/two-factor/setup']);
  }

  return true;
}

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
