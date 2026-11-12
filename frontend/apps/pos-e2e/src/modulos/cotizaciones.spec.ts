import { capturarPantalla50f } from '../soporte/capturas-50f';
import { revisarAuditoria50f } from '../soporte/flujo-50f';
import { expect, test } from '@playwright/test';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';
import { agregarAgua50f, elegirCliente50f } from '../soporte/flujo-50f';

test('cotizaciones: crear, buscar, abrir y editar una cotización', async ({
  page,
}) => {
  test.setTimeout(180000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/cotizaciones');
  await capturarPantalla50f(page, 'cotizaciones-lista');
  await page.getByPlaceholder('Buscar por número...').fill('E2E-INEXISTENTE');
  await expect(
    page.getByText('No hay cotizaciones que coincidan con la búsqueda.'),
  ).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'cotizaciones-vacio');
  await page.getByRole('button', { name: /Nueva cotización$/ }).click();
  await page.locator('nucleo-entidad-selector').first().waitFor();
  await capturarPantalla50f(page, 'cotizaciones-nuevo');
  await elegirCliente50f(page);
  await agregarAgua50f(page);
  await agregarAgua50f(page, 'Refresco 600ml');
  const lineas = page.locator('nucleo-lineas-cotizacion .campos-linea');
  const primera = lineas.nth(0).getByRole('textbox');
  await primera.nth(0).click();
  await primera.nth(0).fill('2');
  await primera.nth(1).click();
  await primera.nth(1).fill('20');
  await primera.nth(2).click();
  await primera.nth(2).fill('3');
  const segunda = lineas.nth(1).getByRole('textbox');
  await segunda.nth(0).click();
  await segunda.nth(0).fill('3');
  await segunda.nth(1).click();
  await segunda.nth(1).fill('25');
  await segunda.nth(2).click();
  await segunda.nth(2).fill('2');
  await expect(page.getByText(/^Total: \$110(?:\.00)?$/)).toBeVisible({ timeout: 20000 });
  const observaciones = 'Cotización E2E ' + Date.now();
  await page.getByLabel('Observaciones', { exact: true }).fill(observaciones);
  await page.getByRole('button', { name: /Guardar cotización$/ }).click();
  await expect(page.getByRole('heading', { name: /^COT-/ })).toBeVisible({ timeout: 20000 });
  const numero = await page.getByRole('heading', { name: /^COT-/ }).innerText();
  await revisarAuditoria50f(page);
  await expect(page.getByText(observaciones, { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole('link', { name: /Editar$/ }).click();
  await page.getByLabel('Observaciones', { exact: true }).fill(observaciones + ' editada');
  await capturarPantalla50f(page, 'cotizaciones-editar');
  await page.locator('nucleo-lineas-cotizacion .campos-linea').nth(1).getByRole('textbox').nth(0).fill('2');
  await expect(page.getByText(/^Total: \$85(?:\.00)?$/)).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: /Guardar cotización$/ }).click();
  await expect(
    page.getByText(observaciones + ' editada', { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.reload();
  await expect(
    page.getByText(observaciones + ' editada', { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await abrirPantalla(page, '/cotizaciones');
  await page.getByPlaceholder('Buscar por número...').fill(numero);
  const fila = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: numero, exact: true }) });
  await expect(fila).toHaveCount(1);
  await capturarPantalla50f(page, 'cotizaciones-lista-con-datos');
  await fila.locator('[aria-label="Ver"]').click();
  await expect(
    page.getByText(observaciones + ' editada', { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: /Convertir a venta/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'cotizaciones-modal-convertir');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: /Anular cotizaci.n/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'cotizaciones-modal-anular');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  sinErrores(errores, '/cotizaciones');
});
