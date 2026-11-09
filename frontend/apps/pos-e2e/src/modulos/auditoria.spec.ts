import { expect, test } from '@playwright/test';

import { crearProducto } from '../soporte/api';
import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('auditoria: abre, filtra y consulta los cambios de un registro', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await crearProducto(page, `Producto auditoria ${Date.now()}`);
  await abrirPantalla(page, '/auditoria');

  await expect(page.getByRole('heading', { name: 'Auditoría' })).toBeVisible();
  await page.getByRole('combobox').first().click();
  await page.getByRole('option').filter({ hasText: 'productos' }).first().click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ver cambios' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await sinViolacionesSerias(page);
  sinErrores(errores, '/auditoria');
});
