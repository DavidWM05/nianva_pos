import { capturarPantalla50f } from '../soporte/capturas-50f';
import { revisarAuditoria50f } from '../soporte/flujo-50f';
import { expect, test } from '@playwright/test';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';
import {
  agregarAgua50f,
  elegirCliente50f,
  pagarMixto50f,
} from '../soporte/flujo-50f';

test('apartados: crear, buscar y registrar un abono con pago mixto', async ({
  page,
}) => {
  test.setTimeout(180000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/apartados');
  await capturarPantalla50f(page, 'apartados-lista');
  await page.getByPlaceholder('Buscar por cliente...').fill('E2E-INEXISTENTE');
  await expect(
    page.getByText('No hay apartados registrados todavía.'),
  ).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'apartados-vacio');
  await page.getByRole('button', { name: /Nuevo apartado$/ }).click();
  await page.locator('nucleo-entidad-selector').first().waitFor();
  await capturarPantalla50f(page, 'apartados-nuevo');
  await elegirCliente50f(page);
  await agregarAgua50f(page);
  const notas = 'Apartado E2E ' + Date.now();
  await page.getByLabel('Notas (opcional)', { exact: true }).fill(notas);
  await page.getByRole('button', { name: /Crear apartado$/ }).click();
  await expect(page.getByText(notas, { exact: true })).toBeVisible({ timeout: 20000 });
  const ruta = new URL(page.url()).pathname;
  await revisarAuditoria50f(page);
  await page.getByRole('tab', { name: /Abonos/ }).click();
  await capturarPantalla50f(page, 'apartados-detalle-abonos');
  await page.getByLabel('Monto a abonar', { exact: true }).fill('10');
  await pagarMixto50f(page, '5');
  const respuesta = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      /\/apartados\/\d+\/abonos$/.test(new URL(r.url()).pathname),
  );
  await page.getByRole('button', { name: /Registrar abono$/ }).click();
  expect((await respuesta).status()).toBe(200);
  await abrirPantalla(page, ruta);
  await page.getByRole('tab', { name: /Abonos/ }).click();
  await expect(
    page.getByRole('cell', { name: /Efectivo.*Tarjeta/ }),
  ).toBeVisible({ timeout: 20000 });
  await abrirPantalla(page, '/apartados');
  await page
    .getByPlaceholder('Buscar por cliente...')
    .fill('Cliente Abarrotes 1');
  await expect(
    page
      .getByRole('cell', { name: 'Cliente Abarrotes 1', exact: true })
      .first(),
  ).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'apartados-lista-con-datos');
  await page.getByRole('button', { name: 'Ver', exact: true }).first().click();
  await expect(page.getByText(notas, { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Cancelar apartado', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'apartados-modal-cancelar');
  await page.getByRole('dialog').getByLabel('Motivo', { exact: true }).fill('Cierre E2E 50f');
  await page.getByRole('button', { name: /Confirmar cancelaci.n/ }).click();
  await expect(page.getByRole('button', { name: 'Entendido', exact: true })).toBeVisible({ timeout: 20000 });
  await capturarPantalla50f(page, 'apartados-modal-resultado');
  await page.getByRole('button', { name: 'Entendido', exact: true }).click();
  sinErrores(errores, '/apartados');
});
