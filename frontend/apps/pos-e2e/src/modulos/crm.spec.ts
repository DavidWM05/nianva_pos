import { capturarPantalla50e } from '../soporte/capturas-50e';
import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('crm: buscar, abrir, crear y editar un cliente', async ({ page }) => {
  test.setTimeout(180000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/crm');
  await capturarPantalla50e(page, 'crm-clientes-lista');
  await page.getByPlaceholder('Buscar por nombre...').fill('E2E-INEXISTENTE');
  await expect(
    page.getByText('No hay clientes que coincidan con la búsqueda.'),
  ).toBeVisible();
  await capturarPantalla50e(page, 'crm-clientes-vacio');
  await page.getByPlaceholder('Buscar por nombre...').fill('');
  await page.getByRole('button', { name: /Nuevo cliente$/ }).click();
  await capturarPantalla50e(page, 'crm-cliente-crear');
  const nombre = 'Cliente E2E ' + Date.now();
  await page.locator('#nombre').fill(nombre);
  await page.locator('#telefono').fill('5551234567');
  await page.getByRole('button', { name: /Crear cliente$/ }).click();
  await expect(
    page.getByRole('heading', { name: nombre, exact: true }),
  ).toBeVisible();
  await page.locator('#telefono').fill('5559876543');
  const guardado = page.waitForResponse(
    (r) =>
      r.request().method() === 'PUT' &&
      new URL(r.url()).pathname.startsWith('/api/v1/clientes'),
    { timeout: 30000 },
  );
  await page.getByRole('button', { name: /Guardar cambios$/ }).click();
  expect((await guardado).status()).toBe(200);
  await expect(
    page.getByText('Cambios guardados.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('#telefono')).toHaveValue('5559876543');
  await abrirPantalla(page, '/crm');
  await page.getByPlaceholder('Buscar por nombre...').fill(nombre);
  await expect(
    page.getByRole('cell', { name: nombre, exact: true }),
  ).toBeVisible();
  await page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: nombre, exact: true }) })
    .locator('[aria-label="Editar"]')
    .click();
  await expect(page.locator('#telefono')).toHaveValue('5559876543');
  for (const tab of [
    { nombre: /General/, clave: 'general' },
    { nombre: /Historial de ventas/, clave: 'ventas' },
    { nombre: /Interacciones/, clave: 'interacciones' },
    { nombre: /Loyalty/, clave: 'puntos' },
    { nombre: /Auditoría/, clave: 'auditoria' },
  ]) {
    await page.getByRole('tab', { name: tab.nombre }).click();
    await capturarPantalla50e(page, 'crm-cliente-detalle-' + tab.clave);
    if (tab.clave === 'interacciones') {
      await page.getByRole('button', { name: /Nueva interacción$/ }).click();
      const dialogo = page.getByRole('dialog', {
        name: 'Nueva interacción',
        exact: true,
      });
      await expect(dialogo).toBeVisible();
      await capturarPantalla50e(page, 'crm-cliente-nueva-interaccion');
      await dialogo.getByRole('combobox', { name: /Tipo/ }).click();
      await expect(
        page.getByRole('option', { name: 'Todas', exact: true }),
      ).toHaveCount(0);
      await page.getByRole('option', { name: 'Nota', exact: true }).click();
      await dialogo.getByLabel('Observación').fill('Interacción de prueba E2E');
      await dialogo
        .getByRole('button', { name: /Guardar interacción$/ })
        .click();
      await expect(dialogo).toBeHidden();
      await expect(
        page.getByText('Interacción de prueba E2E', { exact: true }),
      ).toBeVisible();
      await capturarPantalla50e(page, 'crm-cliente-interaccion-guardada');
    }
    if (tab.clave === 'puntos') {
      await page
        .getByRole('button', { name: 'Ajustar puntos', exact: true })
        .click();
      const dialogo = page.getByRole('dialog', {
        name: 'Ajustar puntos',
        exact: true,
      });
      await expect(dialogo).toBeVisible();
      await capturarPantalla50e(page, 'crm-cliente-ajustar-puntos');
      await dialogo.getByLabel('Puntos (negativo para canjear)').fill('5');
      await dialogo.getByLabel('Motivo').fill('Ajuste de prueba E2E');
      await dialogo.getByRole('button', { name: /Confirmar ajuste$/ }).click();
      await expect(dialogo).toBeHidden();
      await expect(
        page.getByText('5 puntos', { exact: true }).first(),
      ).toBeVisible();
      await capturarPantalla50e(page, 'crm-cliente-puntos-guardados');
      await page
        .getByRole('button', { name: 'Ajustar puntos', exact: true })
        .click();
      await expect(dialogo).toBeVisible();
      await dialogo.getByLabel('Puntos (negativo para canjear)').fill('-2');
      await dialogo.getByLabel('Motivo').fill('Canje de prueba E2E');
      await capturarPantalla50e(page, 'crm-cliente-canje-puntos');
      await dialogo.getByRole('button', { name: /Confirmar ajuste$/ }).click();
      await expect(dialogo).toBeHidden();
      await expect(
        page.getByText('3 puntos', { exact: true }).first(),
      ).toBeVisible();
      await capturarPantalla50e(page, 'crm-cliente-canje-guardado');
    }
  }
  await page.goto('/crm/clientes/999999');
  await expect(
    page.getByText('No se pudo cargar', { exact: false }).first(),
  ).toBeVisible();
  await capturarPantalla50e(page, 'crm-cliente-no-encontrado');
  // Las secciones del cliente inexistente manejan sus respuestas 404 como estados de error.
  sinErrores(errores, '/crm', [
    'GET /api/v1/clientes/999999 -> 404',
    'GET /api/v1/clientes/999999/ventas -> 404',
    'GET /api/v1/clientes/999999/interacciones -> 404',
    'GET /api/v1/clientes/999999/loyalty -> 404',
  ]);
});

test('crm: enviar campaña al segmento seleccionado', async ({ page }) => {
  test.setTimeout(90000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/crm/campanas/nueva');
  await capturarPantalla50e(page, 'crm-campana-formulario');
  await page.getByRole('combobox', { name: /Segmento de clientes/ }).click();
  await expect(
    page.getByRole('option', { name: 'Todas', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('option', { name: 'Todos los clientes', exact: true })
    .click();
  const asunto = 'Campaña E2E ' + Date.now();
  await page.getByLabel('Asunto').fill(asunto);
  await page.getByLabel('Mensaje').fill('Mensaje de prueba E2E');
  await page.getByRole('button', { name: /Enviar campaña$/ }).click();
  await expect(
    page.locator('ui-alert').filter({ hasText: asunto }),
  ).toBeVisible();
  await expect(page.getByLabel('Asunto')).toHaveValue('');
  await capturarPantalla50e(page, 'crm-campana-confirmacion');
  sinErrores(errores, '/crm/campanas/nueva');
});
