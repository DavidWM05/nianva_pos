import { capturarPantalla50f } from './capturas-50f';
import { expect, type Page } from '@playwright/test';

export async function elegirCliente50f(page: Page): Promise<void> {
  const selector = page
    .locator('nucleo-entidad-selector')
    .filter({
      has: page.getByText(/^Cliente(?: \(opcional\))?$/, { exact: true }),
    });
  await selector.getByRole('combobox').fill('Cliente Abarrotes 1');
  await page
    .getByRole('option', { name: 'Cliente Abarrotes 1', exact: true })
    .click();
}

export async function agregarAgua50f(page: Page, producto = 'Agua 1L'): Promise<void> {
  const selector = page
    .locator('nucleo-entidad-selector')
    .filter({ has: page.getByText('Producto', { exact: true }) });
  await selector.locator('input[role=combobox]').fill(producto);
  await page.getByRole('option', { name: producto, exact: true }).click();
  await expect(selector.getByRole('combobox')).toHaveCount(2);
  await selector.getByRole('combobox').nth(1).click();
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: /Agregar línea$/ }).click();
  await expect(
    page.getByRole('cell', { name: new RegExp(producto) }).or(page.getByRole('heading', { name: new RegExp('L.nea .*' + producto) })).first(),
  ).toBeVisible();
}

export async function pagarMixto50f(
  page: Page,
  montoPorLinea: string,
): Promise<void> {
  const pagos = page.locator('nucleo-lineas-pago');
  await pagos.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  await pagos
    .getByPlaceholder('Monto', { exact: true })
    .first()
    .fill(montoPorLinea);
  await pagos.getByRole('button', { name: /Agregar método de pago$/ }).click();
  await pagos.getByRole('combobox').nth(1).click();
  await page
    .getByRole('option', { name: /Tarjeta/ })
    .first()
    .click();
  await pagos
    .getByPlaceholder('Monto', { exact: true })
    .nth(1)
    .fill(montoPorLinea);
}

export async function revisarAuditoria50f(page: Page): Promise<void> {
  await expect(page.locator('nucleo-audit-log-viewer')).toHaveCount(0);
  const modulo = new URL(page.url()).pathname.split('/')[1];
  await capturarPantalla50f(page, modulo + '-detalle-general');
  await page.getByRole('tab', { name: /Auditor.a/ }).click();
  await expect(page.locator('nucleo-audit-log-viewer')).toBeVisible();
  await expect(page.locator('nucleo-audit-log-viewer ui-skeleton')).toHaveCount(0);
  await capturarPantalla50f(page, modulo + '-detalle-auditoria');
  await page.getByRole('tab').first().click();
  await expect(page.locator('nucleo-audit-log-viewer')).toBeHidden();
}
