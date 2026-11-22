import { expect, test, type Page } from '@playwright/test';

import { asegurarCajaAbierta } from '../soporte/api';
import { agregarAgua50f } from '../soporte/flujo-50f';
import { abrirPantalla } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

// Fase 4, B3 (UI-12, SEG-06): los impresos salen de la foto del documento (A6, GET .../impreso).
// Imprimir dos veces seguidas el ticket desde la misma pantalla y con la misma sesion no vuelve a
// cobrar ni rompe la sesion (en Lite, la rotacion del token CSRF rompia la segunda impresion, L-11).
const VENDEDOR = 'vendedor@abarrotes.test';
const API = 'http://127.0.0.1:' + (process.env['POS_E2E_BACKEND_PORT'] ?? '8100') + '/api/v1';
const marco = (page: Page) => page.frameLocator('#ui-impresion');

test.afterEach(async ({ page }) => {
  await asegurarCajaAbierta(page);
});

async function totalDeVentas(page: Page): Promise<number> {
  return page.evaluate(async (api) => {
    const respuesta = await fetch(`${api}/ventas?rows=1`, { credentials: 'include', headers: { Accept: 'application/json' } });

    return ((await respuesta.json()) as { meta: { total: number } }).meta.total;
  }, API);
}

/** Vende una linea de Agua 1L en efectivo por el total y devuelve la venta registrada. */
async function venderAgua(page: Page): Promise<{ id: string; folio: string }> {
  await abrirPantalla(page, '/tpv/venta');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible({ timeout: 20000 });
  await agregarAgua50f(page);
  await expect(page.locator('.venta__total')).not.toHaveText(/\$0\.00/, { timeout: 20000 });
  const total = (await page.locator('.venta__total').textContent())?.replace(/[^0-9.]/g, '') ?? '';
  const pagos = page.locator('nucleo-lineas-pago');
  await pagos.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  await pagos.getByPlaceholder('Monto', { exact: true }).first().fill(total);
  await expect(page.getByRole('button', { name: /Registrar venta$/ })).toBeEnabled({ timeout: 20000 });
  const registro = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  const { data } = (await (await registro).json()) as { data: { id: string; folio: string } };

  return data;
}

test('ticket: dos impresiones seguidas con la misma sesion piden la foto, no vuelven a cobrar y la sesion sigue', async ({ page }) => {
  test.setTimeout(180000);
  await iniciarSesion(page, VENDEDOR);
  await asegurarCajaAbierta(page);
  const cobros: string[] = [];
  page.on('request', (peticion) => {
    if (peticion.method() === 'POST' && new URL(peticion.url()).pathname === '/api/v1/ventas') cobros.push(peticion.url());
  });
  const antes = await totalDeVentas(page);
  const venta = await venderAgua(page);
  await expect(page.getByRole('heading', { name: `Venta ${venta.folio} registrada`, exact: true })).toBeVisible();

  for (let vez = 1; vez <= 2; vez += 1) {
    const impreso = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/v1/ventas/${venta.id}/impreso`);
    await page.getByRole('button', { name: /Imprimir ticket$/ }).click();
    expect((await impreso).status(), `impresion ${vez}`).toBe(200);
    await expect(marco(page).locator('.ui-impreso')).toContainText(`Folio ${venta.folio}`);
    await expect(marco(page).locator('.ui-impreso')).toContainText('Ticket de venta');
  }

  expect(cobros).toHaveLength(1);
  expect(await totalDeVentas(page)).toBe(antes + 1);
  await expect(page.locator('#ui-impresion')).toHaveCount(1);
  // La sesion sigue viva tras las dos impresiones: se puede seguir trabajando.
  await abrirPantalla(page, '/tpv/ventas');
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('detalle: la venta se reimprime en carta con su folio y la sucursal del documento', async ({ page }) => {
  test.setTimeout(180000);
  await iniciarSesion(page, VENDEDOR);
  await asegurarCajaAbierta(page);
  const venta = await venderAgua(page);
  const sucursal = await page.evaluate(async (api) => {
    const respuesta = await fetch(`${api}/sesion`, { credentials: 'include', headers: { Accept: 'application/json' } });

    return ((await respuesta.json()) as { data: { sucursal: { nombre: string } } }).data.sucursal.nombre;
  }, API);

  await abrirPantalla(page, `/tpv/ventas/${venta.id}`);
  await expect(page.getByRole('heading', { name: `Venta ${venta.folio}`, exact: true })).toBeVisible();
  const impreso = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/v1/ventas/${venta.id}/impreso`);
  await page.getByRole('button', { name: 'Imprimir en carta' }).click();
  expect((await impreso).status()).toBe(200);

  await expect(marco(page).locator('.ui-impreso--carta')).toContainText(`Folio ${venta.folio}`);
  await expect(marco(page).locator('.ui-impreso--carta')).toContainText(sucursal);
});

test('corte: al cerrar la caja sin descuadre se imprime su corte con el folio del corte', async ({ page }) => {
  test.setTimeout(180000);
  await iniciarSesion(page, VENDEDOR);
  await asegurarCajaAbierta(page);
  await abrirPantalla(page, '/tpv/caja');
  await expect(page.getByRole('heading', { name: 'Caja abierta', exact: true })).toBeVisible({ timeout: 20000 });
  // Cada metodo contado en su teorico: sin descuadre, el cierre no pide supervisor.
  for (const control of await page.locator('input[id^="caja-conteo-"]').all()) {
    const teorico = Number(((await control.locator('xpath=preceding-sibling::p[1]').textContent()) ?? '').replace(/[^0-9.-]/g, ''));
    await control.fill(teorico.toFixed(2));
  }
  const cierre = page.waitForResponse((r) => r.request().method() === 'PATCH' && /\/api\/v1\/caja\/[0-9a-z]+\/cerrar$/i.test(new URL(r.url()).pathname));
  await page.getByRole('button', { name: 'Cerrar caja' }).click();
  const { data } = (await (await cierre).json()) as { data: { id: string; folio: string } };
  await expect(page.getByRole('heading', { name: 'Caja cerrada', exact: true })).toBeVisible({ timeout: 20000 });

  const impreso = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/v1/caja/${data.id}/impreso`);
  await page.getByRole('button', { name: /Imprimir corte$/ }).click();
  expect((await impreso).status()).toBe(200);
  await expect(marco(page).locator('.ui-impreso')).toContainText('Corte de caja');
  await expect(marco(page).locator('.ui-impreso')).toContainText(`Folio ${data.folio}`);
});
