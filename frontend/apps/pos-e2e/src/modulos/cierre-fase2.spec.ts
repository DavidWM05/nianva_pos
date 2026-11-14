import { expect, test, type Page } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

// Cierre de la Fase 2: las ultimas pantallas migradas a libs/ui (configuracion, detalle de venta y
// Preferencias) pasan axe en claro y en oscuro. El tema por defecto es "sistema" (50n-b), asi que
// basta con emular el esquema de color del sistema operativo.

async function axeEnPantallas(page: Page): Promise<void> {
  await abrirPantalla(page, '/configuracion');
  await expect(page.getByRole('heading', { name: 'Empresa', exact: true })).toBeVisible();
  await sinViolacionesSerias(page);
  await page.getByRole('tab', { name: /Licencia/ }).click();
  await expect(page.getByText(/licencia/i).first()).toBeVisible();
  await sinViolacionesSerias(page);

  await abrirPantalla(page, '/tpv/ventas');
  await page.locator('tbody tr').first().locator('[aria-label^="Ver"]').first().click();
  await expect(page).toHaveURL(/\/tpv\/ventas\/\d+$/);
  await expect(page.getByRole('heading', { name: /^Venta #\d+$/ })).toBeVisible();
  await expect(page.locator('ui-page-header h1')).toHaveText('Ventas');
  await sinViolacionesSerias(page);
  await page.getByRole('tab', { name: /L.neas/ }).click();
  await expect(page.locator('ui-tabla tbody tr').first()).toBeVisible();
  await sinViolacionesSerias(page);

  await abrirPantalla(page, '/perfil/preferencias');
  await expect(page.getByRole('heading', { name: 'Mis dispositivos' })).toBeVisible();
  await sinViolacionesSerias(page);
}

test('cierre Fase 2: configuracion, detalle de venta y preferencias pasan axe en claro y en oscuro', async ({ page }) => {
  test.setTimeout(180000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);

  await page.emulateMedia({ colorScheme: 'light' });
  await axeEnPantallas(page);
  expect(await page.evaluate(() => document.documentElement.classList.contains('nv-tema-oscuro'))).toBe(false);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('nv-tema-oscuro'))).toBe(true);
  await axeEnPantallas(page);
  expect(await page.evaluate(() => document.documentElement.classList.contains('nv-tema-oscuro'))).toBe(true);

  await page.emulateMedia({ colorScheme: 'light' });

  // 404 = tenant sin licencia registrada; la pantalla oculta la seccion (50c).
  sinErrores(errores, '/configuracion', ['GET /api/v1/licencia-local -> 404']);
});
