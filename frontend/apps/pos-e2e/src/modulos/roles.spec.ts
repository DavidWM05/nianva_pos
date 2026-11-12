import { expect, test, type Page } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

const permiso = (page: Page, modulo: string, accion: string) =>
  page.getByRole('group', { name: modulo, exact: true }).getByRole('checkbox', { name: accion, exact: true });

test('roles: crear un rol con permisos de dos modulos usando el filtro y comprobar lo guardado', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/roles');
  await sinViolacionesSerias(page);

  const nombre = `Rol E2E ${Date.now()}`;
  await page.getByText('Nuevo rol', { exact: true }).click();
  await page.locator('#nombre').fill(nombre);

  // Todos los modulos a la vista.
  await expect(permiso(page, 'Clientes', 'Ver')).toBeVisible();
  await sinViolacionesSerias(page);
  await permiso(page, 'Clientes', 'Ver').check();

  // Con el filtro, "Clientes" se oculta pero sigue marcado.
  await page.getByLabel('Filtrar permisos').fill('usuarios');
  await expect(page.getByRole('group', { name: 'Clientes', exact: true })).toHaveCount(0);
  await permiso(page, 'Usuarios', 'Crear').check();
  await expect(page.getByText(/Seleccionados: 2 de/)).toBeVisible();
  await sinViolacionesSerias(page);

  await page.getByRole('button', { name: 'Crear rol' }).click();
  await expect(page.getByText('Rol creado.')).toBeVisible();
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();

  // Lo guardado, leido de nuevo del backend: tambien el permiso que quedo oculto.
  await page.reload();
  await expect(page.locator('#nombre')).toHaveValue(nombre);
  await expect(permiso(page, 'Clientes', 'Ver')).toBeChecked();
  await expect(permiso(page, 'Usuarios', 'Crear')).toBeChecked();
  await expect(permiso(page, 'Usuarios', 'Ver')).not.toBeChecked();
  await sinViolacionesSerias(page);

  sinErrores(errores, '/roles');
});

test('roles: un rol de sistema se ve en solo lectura, con los permisos deshabilitados', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/roles');

  await page.getByRole('row', { name: /vendedor/ }).getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByText('Este es un rol de sistema')).toBeVisible();
  await expect(page.getByLabel('Filtrar permisos')).toHaveCount(0);
  await expect(permiso(page, 'Ventas', 'Ver')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
  await sinViolacionesSerias(page);

  sinErrores(errores, '/roles');
});
