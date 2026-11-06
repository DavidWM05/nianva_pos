import { test } from '@playwright/test';

import { REGISTRO_NAVEGACION_POS } from '../../pos/src/app/modules/modules.config';
import { abrirPantalla, sinErrores, vigilarErrores } from './soporte/humo';
import { iniciarSesion } from './soporte/sesion';

// 50a: cada pantalla del menu abre contra el backend real sin errores de API ni de consola. Es
// la red general de la serie 50: sale del registro de navegacion, asi que una pantalla nueva
// del menu entra sola. Los flujos de cada modulo (crear, editar, guardar) van en su propio spec.

/** Respuestas que una pantalla maneja a proposito, con su razon. */
const API_ESPERADA: Record<string, readonly string[]> = {
  // El escenario no registra licencia local: el backend responde 404 y la pantalla oculta la
  // seccion de Licencia (ConfiguracionComponent).
  configuracion: ['GET /api/v1/licencia-local -> 404'],
};

test.beforeEach(async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
});

for (const entrada of REGISTRO_NAVEGACION_POS) {
  test(`${entrada.nombre} (/${entrada.ruta}) abre sin errores`, async ({ page }) => {
    const errores = vigilarErrores(page);

    await abrirPantalla(page, entrada.ruta);

    sinErrores(errores, entrada.ruta, API_ESPERADA[entrada.ruta]);
  });
}
