import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('inicio: muestra los KPI de ventas y caja', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/nucleo');

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await expect(page.getByText('Ventas de hoy')).toBeVisible();
  await expect(page.getByText('Caja', { exact: true })).toBeVisible();
  await sinViolacionesSerias(page);
  sinErrores(errores, '/nucleo');
});
