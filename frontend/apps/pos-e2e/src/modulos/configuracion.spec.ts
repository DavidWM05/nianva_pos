import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('configuracion: abre, guarda empresa y muestra la licencia', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/configuracion');

  await expect(page.getByRole('heading', { name: 'Empresa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Guardar configuración' }).first().click();
  await expect(page.getByText('Configuración guardada.')).toBeVisible();
  await sinViolacionesSerias(page);

  await page.getByRole('tab', { name: /Licencia/ }).click();
  await expect(page.getByText(/licencia/i).first()).toBeVisible();

  // 404 = tenant sin licencia registrada; la pantalla oculta la seccion (50c).
  sinErrores(errores, '/configuracion', ['GET /api/v1/licencia-local -> 404']);
});
