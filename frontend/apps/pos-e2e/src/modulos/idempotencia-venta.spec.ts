import { expect, test, type Page } from '@playwright/test';

import { asegurarCajaAbierta } from '../soporte/api';
import { agregarAgua50f } from '../soporte/flujo-50f';
import { abrirPantalla } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

// Fase 4, B2 (API-07): la venta manda su Idempotency-Key. Si el servidor la registra pero la
// respuesta se pierde, el cajero reintenta el mismo carrito con la misma llave y el servidor
// devuelve la misma venta sin duplicarla. La venta siguiente lleva otra llave.
const VENDEDOR = 'vendedor@abarrotes.test';
const API = 'http://127.0.0.1:' + (process.env['POS_E2E_BACKEND_PORT'] ?? '8100') + '/api/v1';
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

test.afterEach(async ({ page }) => {
  await asegurarCajaAbierta(page);
});

async function totalDeVentas(page: Page): Promise<number> {
  return page.evaluate(async (api) => {
    const respuesta = await fetch(`${api}/ventas?rows=1`, { credentials: 'include', headers: { Accept: 'application/json' } });

    return ((await respuesta.json()) as { meta: { total: number } }).meta.total;
  }, API);
}

/** Una linea de Agua 1L pagada en efectivo por el total que muestra la pantalla. */
async function capturarVenta(page: Page): Promise<void> {
  await agregarAgua50f(page);
  // El precio lo resuelve el servidor (cotizar): se espera a que el total deje de ser cero.
  await expect(page.locator('.venta__total')).not.toHaveText(/\$0\.00/, { timeout: 20000 });
  const total =(await page.locator('.venta__total').textContent())?.replace(/[^0-9.]/g, '') ?? '';
  const pagos = page.locator('nucleo-lineas-pago');
  await pagos.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  await pagos.getByPlaceholder('Monto', { exact: true }).first().fill(total);
  await expect(page.getByRole('button', { name: /Registrar venta$/ })).toBeEnabled({ timeout: 20000 });
}

test('venta: si la respuesta se pierde, el reintento lleva la misma llave y no duplica la venta; la siguiente lleva otra', async ({ page }) => {
  test.setTimeout(180000);
  await iniciarSesion(page, VENDEDOR);
  await asegurarCajaAbierta(page);
  await abrirPantalla(page, '/tpv/venta');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible({ timeout: 20000 });
  const antes = await totalDeVentas(page);

  const llaves: string[] = [];
  let perderRespuesta = true;
  await page.route(`${API}/ventas`, async (ruta) => {
    if (ruta.request().method() !== 'POST') {
      return ruta.continue();
    }
    llaves.push(ruta.request().headers()['idempotency-key'] ?? '');
    if (perderRespuesta) {
      perderRespuesta = false;
      // El servidor la recibe y la registra; la respuesta no llega al navegador.
      await ruta.fetch();
      return ruta.abort('failed');
    }

    return ruta.continue();
  });

  await capturarVenta(page);
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  await expect(page.getByText('No hay conexión con el servidor.', { exact: false })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible();

  const reintento = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  expect((await reintento).status()).toBe(201);
  await expect(page.getByRole('heading', { name: /^Venta #\S+ registrada$/ })).toBeVisible();

  expect(llaves[0]).toMatch(ULID);
  expect(llaves[1]).toBe(llaves[0]);
  expect(await totalDeVentas(page)).toBe(antes + 1);

  await page.getByRole('button', { name: 'Nueva venta' }).click();
  await capturarVenta(page);
  const siguiente = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  expect((await siguiente).status()).toBe(201);

  expect(llaves[2]).toMatch(ULID);
  expect(llaves[2]).not.toBe(llaves[0]);
  expect(await totalDeVentas(page)).toBe(antes + 2);
});
