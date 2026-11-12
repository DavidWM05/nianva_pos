import { capturarPantalla50f } from '../soporte/capturas-50f';
import { revisarAuditoria50f } from '../soporte/flujo-50f';
import { expect, test } from '@playwright/test';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';
import { agregarAgua50f, pagarMixto50f } from '../soporte/flujo-50f';

test('devoluciones: buscar venta y registrar un reembolso con pago mixto', async ({
  page,
}) => {
  test.setTimeout(180000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/devoluciones');
  await capturarPantalla50f(page, 'devoluciones-lista');
  await abrirPantalla(page, '/tpv/venta');
  await agregarAgua50f(page);
  await agregarAgua50f(page, 'Refresco 600ml');
  await pagarMixto50f(page, '20');
  const ventaCreada = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  const venta: { data: { id: number } } = await (await ventaCreada).json();
  await abrirPantalla(page, '/devoluciones');
  await page
    .getByRole('button', { name: /Nueva devolución \/ cambio$/ })
    .click();
  await page
    .getByLabel('Número de venta', { exact: true })
    .fill(String(venta.data.id));
  await capturarPantalla50f(page, 'devoluciones-nueva-buscar');
  await page.getByRole('button', { name: /Buscar$/ }).click();
  const tabla = page.locator('nucleo-devolucion-form .campos-linea');
  await expect(tabla.getByRole('textbox')).toHaveCount(2);
  await tabla.getByRole('textbox').nth(0).fill('1');
  await tabla.getByRole('textbox').nth(1).fill('1');
  await tabla.getByRole('textbox').nth(0).fill('0');
  await expect(page.getByText(/^Monto a devolver: \$22(?:\.00)?$/)).toBeVisible({ timeout: 20000 });
  await tabla.getByRole('textbox').nth(0).fill('1');
  await tabla.getByRole('checkbox').nth(1).check();
  await expect(page.getByText(/Regresan a stock: 1 unidad\(es\) · Merma: 1 unidad\(es\)/)).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'devoluciones-nueva-reembolso');
  await page.getByRole('radio', { name: 'Cambio', exact: true }).check();
  await capturarPantalla50f(page, 'devoluciones-nueva-cambio');
  await page.getByRole('radio', { name: /Devoluci.n/, exact: true }).check();
  await pagarMixto50f(page, '20');
  const motivo = 'Devolución E2E ' + Date.now();
  await page.locator('nucleo-devolucion-form textarea').fill(motivo);
  const respuesta = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      new URL(r.url()).pathname === '/api/v1/devoluciones',
  );
  await page.getByRole('button', { name: /Registrar$/ }).click();
  expect((await respuesta).status()).toBe(201);
  await expect(page.getByText(motivo, { exact: true })).toBeVisible({ timeout: 20000 });
  const ruta = new URL(page.url()).pathname;
  await revisarAuditoria50f(page);
  await page.reload();
  await expect(page.getByText(motivo, { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Efectivo.*Tarjeta/)).toBeVisible({ timeout: 20000 });
  await abrirPantalla(page, '/devoluciones');
  await capturarPantalla50f(page, 'devoluciones-lista-con-datos');
  await page.getByRole('button', { name: 'Ver', exact: true }).first().click();
  await expect(page.getByText(motivo, { exact: true })).toBeVisible({ timeout: 20000 });
  sinErrores(errores, '/devoluciones');
});
