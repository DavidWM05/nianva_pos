import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('metodos de pago: crear y ver el detalle', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/metodos-pago');
  await sinViolacionesSerias(page);

  const nombre = `Pago E2E ${Date.now()}`;
  await page.getByText('Nuevo método de pago', { exact: true }).click();
  await page.locator('#nombre').fill(nombre);
  await page.getByRole('button', { name: 'Crear método de pago' }).click();

  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
  await expect(page.getByText('Método de pago creado.')).toBeVisible();
  await sinViolacionesSerias(page);

  sinErrores(errores, '/metodos-pago');
});
