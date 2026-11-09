import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('unidades de medida: crear y ver en la lista', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/unidades-medida');

  const nombre = `Unidad E2E ${Date.now()}`;
  await page.getByRole('button', { name: 'Nueva unidad' }).click();
  await page.getByLabel('Nombre').fill(nombre);
  await page.getByLabel('Abreviatura').fill('e2e');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await expect(page.getByText(nombre)).toBeVisible();
  await sinViolacionesSerias(page);
  sinErrores(errores, '/unidades-medida');
});
