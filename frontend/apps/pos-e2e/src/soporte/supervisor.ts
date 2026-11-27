import { expect, type Locator, type Page } from '@playwright/test';

import { crearSupervisor } from './backend';
import type { ErroresDePantalla } from './humo';

/**
 * Fase 4 (SEG-05): las operaciones de dinero
 * protegidas abren el dialogo "Autorización de supervisor". La supervisora del e2e tiene los roles
 * del vendedor del escenario, nombre propio para elegirla y PIN de caja.
 */
export const SUPERVISORA = 'supervisora@abarrotes.test';
export const NOMBRE_SUPERVISORA = 'Supervisora Turno';
export const PIN_SUPERVISORA = '3579';

/** Da de alta (o deja como nueva) a la supervisora. Va en un beforeAll. */
export function prepararSupervisora(): void {
  crearSupervisor('vendedor@abarrotes.test', SUPERVISORA, NOMBRE_SUPERVISORA, PIN_SUPERVISORA);
}

export const dialogoSupervisor = (page: Page): Locator => page.getByRole('dialog', { name: 'Autorización de supervisor' });

/**
 * Elige a la supervisora, escribe `pin` con el teclado, lo envia con Enter y devuelve el estado de
 * POST /autorizaciones.
 */
export async function autorizarComoSupervisora(page: Page, pin = PIN_SUPERVISORA, nombre = NOMBRE_SUPERVISORA): Promise<number> {
  const dialogo = dialogoSupervisor(page);
  await expect(dialogo).toBeVisible({ timeout: 20000 });
  // Con un solo elegible, el dialogo lo deja elegido y pasa el foco al PIN al terminar de cargar
  // GET /supervisores (abrir el select en ese momento lo cerraria). Si no aparece elegida, hay
  // varios elegibles: el dialogo no mueve el foco y se elige a mano.
  const supervisor = dialogo.getByRole('combobox', { name: 'Supervisor' });
  const elegida = await expect(supervisor)
    .toContainText(nombre, { timeout: 3000 })
    .then(() => true, () => false);
  if (!elegida) {
    await supervisor.click();
    await page.getByRole('option', { name: nombre, exact: true }).click();
  }
  await dialogo.getByRole('textbox', { name: 'PIN del supervisor' }).focus();
  for (const digito of pin) {
    await page.keyboard.press(digito);
  }
  const respuesta = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/autorizaciones'));
  await page.keyboard.press('Enter');

  return (await respuesta).status();
}

/** Las operaciones que el servidor puede rechazar con 403 supervisor_requerido (SEG-05, F4-7). */
const RUTAS_SUPERVISADAS = [
  /^POST \/api\/v1\/ventas -> 403$/,
  /^PATCH \/api\/v1\/ventas\/[0-9a-z]{26}\/anular -> 403$/,
  /^PATCH \/api\/v1\/apartados\/[0-9a-z]{26}\/cancelar -> 403$/,
  /^PATCH \/api\/v1\/caja\/[0-9a-z]{26}\/cerrar -> 403$/,
  /^POST \/api\/v1\/devoluciones -> 403$/,
];

/**
 * Los 403 que la pantalla atiende abriendo el dialogo del supervisor: van en `apiEsperada` de
 * sinErrores. Solo los de las rutas supervisadas; cualquier otro error sigue fallando.
 */
export function rechazosQuePidenSupervisor(errores: ErroresDePantalla): string[] {
  return errores.api.filter((error) => RUTAS_SUPERVISADAS.some((ruta) => ruta.test(error)));
}
