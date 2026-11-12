import { capturarPantalla50h } from '../soporte/capturas-50h';
import { expect, test } from '@playwright/test';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';
import { prepararSaldos50h } from '../soporte/saldos-50h';

test('saldos: cobrar y pagar conservan abonos, referencias y saldo al recargar', async ({
  page,
}) => {
  test.setTimeout(120000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  prepararSaldos50h();
  const errores = vigilarErrores(page);
  for (const [ruta, nombre, accion, confirmar] of [
    [
      'cuentas-cobrar',
      'Cliente saldos E2E',
      'Registrar abono',
      'Confirmar abono',
    ],
    [
      'cuentas-pagar',
      'Proveedor saldos E2E',
      'Registrar pago',
      'Confirmar pago',
    ],
  ]) {
    await abrirPantalla(page, '/' + ruta);
    await page.getByPlaceholder(/Buscar por/).fill(nombre);
    await expect(
      page.getByRole('cell', { name: nombre, exact: true }).first(),
    ).toBeVisible();
    await page
      .locator('[aria-label="Ver"] button, button[aria-label="Ver"]')
      .first()
      .click();
    await page.getByRole('button', { name: new RegExp(accion + '$') }).click();
    const modal = page.getByRole('dialog');
    await expect(modal.locator('ui-btn-enviar button')).toBeDisabled();
    await capturarPantalla50h(page, ruta + '-modal-inicial');
    await modal.getByRole('textbox', { name: 'Monto', exact: true }).fill('10');
    await modal.getByRole('combobox').click();
    await expect(
      page.getByRole('option', { name: 'Todas', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('option', { name: /Efectivo$/ }).click();
    await modal
      .getByLabel('Referencia (opcional)', { exact: true })
      .fill('Referencia 50h');
    await expect(modal.locator('ui-btn-enviar button')).toBeEnabled();
    await capturarPantalla50h(page, ruta + '-modal-listo');
    await modal
      .getByRole('button', { name: new RegExp(confirmar + '$') })
      .click();
    await expect(
      page.getByText('Referencia 50h', { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByText('Referencia 50h', { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('dd').filter({ hasText: '$90.00' }),
    ).toBeVisible();
  }
  sinErrores(errores, 'cuentas');
});

test('saldos: emitir, buscar y recargar una gift card', async ({ page }) => {
  test.setTimeout(120000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/gift-cards');
  await page
    .getByRole('button', { name: /Emitir gift card|Nueva gift card/ })
    .click();
  await expect(page.locator('ui-btn-enviar button')).toBeDisabled();
  await capturarPantalla50h(page, 'gift-cards-emitir');
  await page.getByRole('textbox', { name: 'Monto', exact: true }).fill('100');
  await page.getByRole('button', { name: /Emitir gift card$/ }).click();
  await expect(
    page.getByRole('button', { name: /Recargar saldo$/ }),
  ).toBeVisible();
  const codigo = await page
    .locator('h1, h2')
    .filter({ hasText: /^GC-/ })
    .textContent();
  await page.getByRole('button', { name: /Recargar saldo$/ }).click();
  await expect(
    page.getByRole('dialog').locator('ui-btn-enviar button'),
  ).toBeDisabled();
  await capturarPantalla50h(page, 'gift-cards-modal-recarga');
  await page
    .getByRole('dialog')
    .getByRole('textbox', { name: 'Monto a recargar', exact: true })
    .fill('25');
  await capturarPantalla50h(page, 'gift-cards-modal-recarga-listo');
  await page.getByRole('button', { name: /Confirmar recarga$/ }).click();
  await expect(page.locator('dd').filter({ hasText: '$125.00' })).toBeVisible();
  await page.reload();
  await expect(page.locator('dd').filter({ hasText: '$125.00' })).toBeVisible();
  await abrirPantalla(page, '/gift-cards');
  await page.getByPlaceholder('Buscar por código...').fill(codigo!.trim());
  await expect(
    page.getByRole('cell', { name: codigo!.trim(), exact: true }),
  ).toBeVisible();
  await page
    .locator('[aria-label="Ver"] button, button[aria-label="Ver"]')
    .first()
    .click();
  await expect(page.locator('dd').filter({ hasText: '$125.00' })).toBeVisible();
  sinErrores(errores, 'gift-cards');
});

test('saldos: notas de crédito permiten filtrar cliente y recorrer el detalle de solo lectura', async ({
  page,
}) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  prepararSaldos50h();
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/notas-credito');
  const selector = page.locator('nucleo-entidad-selector');
  await selector.getByRole('combobox').fill('Cliente saldos E2E');
  await page
    .getByRole('option', { name: /Cliente saldos E2E$/ })
    .first()
    .click();
  await expect(
    page.getByRole('cell', { name: /Cliente saldos E2E$/ }).first(),
  ).toBeVisible();
  await page
    .locator('[aria-label="Ver"] button, button[aria-label="Ver"]')
    .first()
    .click();
  await expect(
    page.getByText('Esta nota de crédito no se ha usado todavía.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Devolución #/ })).toBeVisible();
  sinErrores(errores, 'notas-credito');
});

test('saldos: crear un plan, pagar una cuota y comprobar el estado guardado', async ({
  page,
}) => {
  test.setTimeout(120000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const datos = prepararSaldos50h();
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/ventas-plazos');
  await expect(page.locator('ui-empty')).toBeVisible();
  await capturarPantalla50h(page, 'ventas-plazos-vacio');
  await page.getByRole('button', { name: /Nuevo plan de pago/ }).click();
  await expect(page.locator('ui-btn-enviar button')).toBeDisabled();
  await capturarPantalla50h(page, 'ventas-plazos-nuevo-inicial');
  await page
    .locator('nucleo-entidad-selector')
    .getByRole('combobox')
    .fill('Cliente saldos E2E');
  await page
    .getByRole('option', { name: new RegExp('Venta #' + datos.venta + ' ') })
    .click();
  await capturarPantalla50h(page, 'ventas-plazos-nuevo');
  await page
    .getByRole('spinbutton', { name: 'Número de cuotas (2 a 36)', exact: true })
    .fill('2');
  await page.getByRole('button', { name: /Crear plan de pago$/ }).click();
  await page
    .getByRole('button', { name: /Pagar$/ })
    .first()
    .click();
  await capturarPantalla50h(page, 'ventas-plazos-modal-pago');
  await page.getByRole('button', { name: /Confirmar pago$/ }).click();
  await expect(page.getByRole('cell', { name: /^pagada$/i })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: /^pagada$/i })).toBeVisible();
  await abrirPantalla(page, '/ventas-plazos');
  await expect(
    page.getByRole('cell', { name: /Cliente saldos E2E$/ }).first(),
  ).toBeVisible();
  await page
    .locator('[aria-label="Ver"] button, button[aria-label="Ver"]')
    .first()
    .click();
  await expect(page.getByRole('cell', { name: /^pagada$/i })).toBeVisible();
  sinErrores(errores, 'ventas-plazos');
});

test('saldos: listados, detalles y auditoría accesibles en escritorio y móvil', async ({
  page,
}) => {
  test.setTimeout(360000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  prepararSaldos50h(true);
  const errores = vigilarErrores(page);
  const rutas = [
    'cuentas-cobrar',
    'cuentas-pagar',
    'gift-cards',
    'notas-credito',
    'ventas-plazos',
  ];
  for (const ruta of rutas) {
    await abrirPantalla(page, '/' + ruta);
    await capturarPantalla50h(page, ruta + '-lista');
    if (
      ruta === 'cuentas-cobrar' ||
      ruta === 'cuentas-pagar' ||
      ruta === 'gift-cards'
    ) {
      await page.getByPlaceholder(/Buscar por/).fill('E2E-INEXISTENTE-50H');
      await expect(page.locator('ui-empty')).toBeVisible();
      await capturarPantalla50h(page, ruta + '-vacio');
      await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    }
    if (ruta === 'notas-credito') {
      await page
        .locator('nucleo-entidad-selector')
        .getByRole('combobox')
        .fill('Cliente sin notas lectura 50h');
      await page
        .getByRole('option', {
          name: 'Cliente sin notas lectura 50h',
          exact: true,
        })
        .click();
      await expect(page.locator('ui-empty')).toBeVisible();
      await capturarPantalla50h(page, ruta + '-vacio');
      await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    }
    const nombre =
      ruta === 'cuentas-pagar'
        ? 'Proveedor saldos lectura 50h'
        : 'Cliente saldos lectura 50h';
    await page
      .getByRole('row')
      .filter({ hasText: nombre })
      .getByRole('button', { name: 'Ver', exact: true })
      .click();
    await expect(page.locator('nucleo-record-tabs')).toBeVisible();
    await capturarPantalla50h(page, ruta + '-detalle-general');
    await page.getByRole('tab', { name: /Auditor.a/ }).click();
    await expect(page.locator('nucleo-audit-log-viewer')).toBeVisible();
    await expect(
      page.locator('nucleo-audit-log-viewer ui-skeleton'),
    ).toHaveCount(0);
    await capturarPantalla50h(page, ruta + '-detalle-auditoria');
    await page.goto('/' + ruta + '/999999999');
    await expect(
      page.getByRole('button', { name: 'Reintentar', exact: true }),
    ).toBeVisible();
    await capturarPantalla50h(page, ruta + '-404');
  }
  // Cada 404 corresponde al registro inexistente que prueba el estado de error.
  sinErrores(
    errores,
    'saldos-lectura',
    rutas.map(
      (ruta) =>
        'GET /api/v1/' +
        (ruta === 'ventas-plazos' ? 'planes-pago-cliente' : ruta) +
        '/999999999 -> 404',
    ),
  );
});
