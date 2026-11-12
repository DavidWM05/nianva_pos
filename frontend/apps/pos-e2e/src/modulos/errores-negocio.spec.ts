import { expect, test } from '@playwright/test';

import { rolConUsuarioAsignado } from '../soporte/backend';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

// ARQ-12 y UI-13: el rechazo de negocio de una accion lo muestra el interceptor con el message del
// backend, y el toast.error que la pantalla dispara despues por el mismo fallo se descarta.
const MENSAJE = 'No puedes eliminar un rol con usuarios asignados. Quita el rol de esos usuarios primero.';

test('eliminar un rol con usuarios asignados muestra un solo toast, con el mensaje del backend', async ({ page }) => {
  const nombre = 'Rol con usuarios E2E';
  rolConUsuarioAsignado('vendedor@abarrotes.test', nombre, 'con-rol-e2e@abarrotes.test');
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/roles');

  await page.getByRole('row', { name: new RegExp(nombre) }).getByRole('button', { name: /Eliminar/ }).click();
  const respuesta = page.waitForResponse((r) => r.request().method() === 'DELETE' && /\/api\/v1\/roles\/\d+$/.test(r.url()));
  await page.getByRole('dialog').getByRole('button', { name: 'Aceptar' }).click();
  const rechazo = await respuesta;
  expect(rechazo.status()).toBe(422);

  const toasts = page.locator('ui-toast-content');
  await expect(toasts).toHaveCount(1);
  await expect(toasts).toContainText(MENSAJE);
  // La pantalla dispara su toast.error despues: sigue habiendo uno solo.
  await page.waitForTimeout(500);
  await expect(toasts).toHaveCount(1);
  await expect(page.getByRole('row', { name: new RegExp(nombre) })).toBeVisible();

  sinErrores(errores, '/roles', [`DELETE ${new URL(rechazo.url()).pathname} -> 422`]);
});
