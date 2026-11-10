import { capturarPantalla50e } from '../soporte/capturas-50e';
import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('precios: buscar, crear y editar una regla', async ({ page }) => {
  test.setTimeout(90000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/precios');
  await capturarPantalla50e(page, 'precios-reglas-lista');
  const lista = page.locator('nucleo-reglas-precio-list');
  const vacias = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/v1/reglas-precio' &&
      new URL(r.url()).searchParams.get('filtro_nombre') === 'E2E-INEXISTENTE',
    { timeout: 30000 },
  );
  await lista.getByPlaceholder('Buscar por nombre...').fill('E2E-INEXISTENTE');
  expect((await vacias).status()).toBe(200);
  await expect(
    page.getByText('No hay reglas de precio que coincidan con la búsqueda.'),
  ).toBeVisible();
  await capturarPantalla50e(page, 'precios-reglas-vacio');
  const filtradas = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/api/v1/reglas-precio' &&
      new URL(r.url()).searchParams.get('filtro_nombre') === 'Mayoreo',
    { timeout: 30000 },
  );
  await lista.getByPlaceholder('Buscar por nombre...').fill('Mayoreo');
  expect((await filtradas).status()).toBe(200);
  await expect(
    lista.getByRole('cell', { name: 'Mayoreo 3x2 agua' }).first(),
  ).toBeVisible();
  await lista.getByPlaceholder('Buscar por nombre...').fill('');
  await lista.getByRole('button', { name: /Nueva regla$/ }).click();
  await capturarPantalla50e(page, 'precios-regla-crear');
  await page.getByRole('combobox', { name: /Aplica a/ }).click();
  await expect(
    page.getByRole('option', { name: 'Todas', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('option', { name: 'Una categoría', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Categoría', exact: true })
    .fill('Granel');
  await page.getByRole('option', { name: /Granel/ }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
  await capturarPantalla50e(page, 'precios-regla-crear-categoria');
  const nombre = 'Regla E2E ' + Date.now();
  await page.locator('#nombre').fill(nombre);
  await page.locator('#valor').fill('12');
  await page.getByRole('button', { name: /Crear regla$/ }).click();
  await expect(
    page.getByRole('heading', { name: nombre, exact: true }),
  ).toBeVisible();
  await capturarPantalla50e(page, 'precios-regla-detalle-general');
  await page.getByRole('tab', { name: /Auditoría/ }).click();
  await capturarPantalla50e(page, 'precios-regla-detalle-auditoria');
  await page.getByRole('tab', { name: /General/ }).click();
  await page.locator('#nombre').fill(nombre + ' editada');
  const guardado = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname.startsWith('/api/v1/'),
    { timeout: 30000 },
  );
  await page.getByRole('button', { name: /Guardar cambios$/ }).click();
  expect((await guardado).status()).toBe(200);
  await expect(
    page.getByText('Cambios guardados.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('#nombre')).toHaveValue(nombre + ' editada');
  await page.goto('/precios/reglas/999999');
  await expect(
    page.getByText('No se pudo cargar', { exact: false }),
  ).toBeVisible();
  await capturarPantalla50e(page, 'precios-regla-no-encontrado');
  // El 404 de un registro inexistente es el estado de error que se verifica y captura.
  sinErrores(errores, '/precios/reglas', [
    'GET /api/v1/reglas-precio/999999 -> 404',
  ]);
});

test('precios: buscar, crear y editar un cupón', async ({ page }) => {
  test.setTimeout(90000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/precios');
  await page.getByRole('tab', { name: /Cupones/ }).click();
  await capturarPantalla50e(page, 'precios-cupones-lista');
  const lista = page.locator('nucleo-cupones-list');
  await lista
    .getByPlaceholder('Buscar por código o nombre...')
    .fill('E2E-INEXISTENTE');
  await expect(
    lista.getByText('No hay cupones que coincidan con la búsqueda.'),
  ).toBeVisible();
  await lista.getByPlaceholder('Buscar por código o nombre...').fill('');
  await lista.getByRole('button', { name: /Nuevo cupón$/ }).click();
  await capturarPantalla50e(page, 'precios-cupon-crear');
  const codigo = 'E2E-' + Date.now();
  await page.locator('#codigo').fill(codigo);
  await page.locator('#nombre').fill('Cupón de prueba');
  await page.locator('#valor').fill('15');
  await page.getByRole('button', { name: /Crear cupón$/ }).click();
  await expect(
    page.getByRole('heading', { name: codigo, exact: true }),
  ).toBeVisible();
  await capturarPantalla50e(page, 'precios-cupon-detalle-general');
  await page.getByRole('tab', { name: /Auditoría/ }).click();
  await capturarPantalla50e(page, 'precios-cupon-detalle-auditoria');
  await page.getByRole('tab', { name: /General/ }).click();
  await page.locator('#nombre').fill('Cupón editado');
  const guardado = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname.startsWith('/api/v1/'),
    { timeout: 30000 },
  );
  await page.getByRole('button', { name: /Guardar cambios$/ }).click();
  expect((await guardado).status()).toBe(200);
  await expect(
    page.getByText('Cambios guardados.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('#nombre')).toHaveValue('Cupón editado');
  await page.goto('/precios/cupones/999999');
  await expect(
    page.getByText('No se pudo cargar', { exact: false }),
  ).toBeVisible();
  await capturarPantalla50e(page, 'precios-cupon-no-encontrado');
  // El 404 de un registro inexistente es el estado de error que se verifica y captura.
  sinErrores(errores, '/precios/cupones', [
    'GET /api/v1/cupones/999999 -> 404',
  ]);
});
