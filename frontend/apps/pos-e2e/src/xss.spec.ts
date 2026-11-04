import { expect, test, type Locator, type Page } from '@playwright/test';

import { crearCliente, crearProducto } from './soporte/api';
import { iniciarSesion } from './soporte/sesion';

declare global {
  interface Window {
    __xss?: number;
  }
}

const NOMBRE_XSS = '<img src=x onerror="window.__xss=1">Producto <b>prueba</b>';

async function comprobarTextoLiteral(page: Page, alcance: Locator): Promise<void> {
  await expect(alcance).toContainText(NOMBRE_XSS);
  await expect(alcance.locator('img, b')).toHaveCount(0);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
}

test.describe.configure({ mode: 'serial' });

test('el nombre con HTML se muestra literal y no ejecuta XSS en las pantallas del POS', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');

  const producto = await crearProducto(page, NOMBRE_XSS);
  const cliente = await crearCliente(page, NOMBRE_XSS);

  await page.goto('/inventario/productos');
  await page.locator('.productos-list__buscar').fill('onerror');
  const filaProducto = page.locator('tbody tr').filter({ hasText: NOMBRE_XSS }).first();
  await expect(filaProducto).toBeVisible();
  await comprobarTextoLiteral(page, filaProducto);

  await page.goto(`/inventario/productos/${producto.id}`);
  const tituloProducto = page.locator('h1').first();
  await expect(tituloProducto).toHaveText(NOMBRE_XSS);
  await comprobarTextoLiteral(page, tituloProducto);

  await page.goto('/tpv/venta');
  const buscadorProducto = page.locator('input[placeholder="Buscar producto por nombre..."]');
  await expect(buscadorProducto).toBeVisible();
  await buscadorProducto.fill('onerror');
  const resultadoBusqueda = page.locator('.p-autocomplete-panel, .p-autocomplete-overlay').filter({ hasText: NOMBRE_XSS }).first();
  await expect(resultadoBusqueda).toBeVisible();
  await comprobarTextoLiteral(page, resultadoBusqueda);

  await page.goto('/crm/clientes');
  await page.locator('.clientes-list__buscar').fill('onerror');
  const filaCliente = page.locator('tbody tr').filter({ hasText: NOMBRE_XSS }).first();
  await expect(filaCliente).toBeVisible();
  await comprobarTextoLiteral(page, filaCliente);

  await expect(cliente.id).toBeGreaterThan(0);
});
