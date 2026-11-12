import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('usuarios: crear un usuario con un rol y comprobar lo guardado', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/usuarios');
  await sinViolacionesSerias(page);

  const sello = Date.now();
  const nombre = `Usuario E2E ${sello}`;
  const correo = `e2e.${sello}@abarrotes.test`;

  // mat-select no abre sin opciones: se espera a que lleguen los roles.
  const rolesCargados = page.waitForResponse((respuesta) => new URL(respuesta.url()).pathname === '/api/v1/roles');
  await page.getByText('Nuevo usuario', { exact: true }).click();
  await rolesCargados;
  await page.locator('#nombre').fill(nombre);
  await page.locator('#correo').fill(correo);
  await page.locator('#password').fill('password-e2e-123');

  // Teclado, como un usuario: abre la lista con Enter desde el control con foco.
  await page.getByRole('combobox', { name: 'Roles' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: 'vendedor', exact: true }).click();
  await page.keyboard.press('Escape');
  await sinViolacionesSerias(page);

  await page.getByRole('button', { name: 'Crear usuario' }).click();
  await expect(page.getByText('Usuario creado.')).toBeVisible();
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();

  // Lo guardado, leido de nuevo del backend.
  await page.reload();
  await expect(page.locator('#nombre')).toHaveValue(nombre);
  await expect(page.locator('#correo')).toHaveValue(correo);
  await expect(page.locator('nucleo-usuario-form')).toContainText('vendedor');
  await sinViolacionesSerias(page);

  sinErrores(errores, '/usuarios');
});
