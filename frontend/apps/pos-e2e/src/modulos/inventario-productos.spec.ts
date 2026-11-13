import { prepararStockBajo50m } from '../soporte/inventario-50m';
import { capturarPantalla50m } from '../soporte/capturas-50m';
import { expect, test } from '@playwright/test';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test('inventario productos: crear variante, registrar compra y consultar su kardex', async ({
  page,
}) => {
  test.setTimeout(360000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/inventario');
  await capturarPantalla50m(page, 'productos-listado');
  const nombre = 'Producto 50m ' + Date.now();
  await page.getByRole('button', { name: /Nuevo producto$/ }).click();
  await capturarPantalla50m(page, 'producto-crear');
  await page.getByRole('textbox', { name: /^Nombre/ }).fill(nombre);
  await page
    .getByRole('textbox', { name: 'Precio de compra', exact: true })
    .fill('5');
  await page
    .getByRole('textbox', { name: 'Precio de venta', exact: true })
    .fill('10');
  await capturarPantalla50m(page, 'producto-formulario');
  await page
    .getByRole('button', { name: 'Crear producto', exact: true })
    .click();
  await expect(page).toHaveURL(/\/inventario\/productos\/\d+$/);
  const detalle = page.url();
  await capturarPantalla50m(page, 'producto-general-sin-variantes');
  await page.getByRole('button', { name: /Nueva variante$/ }).click();
  await capturarPantalla50m(page, 'variante-nueva');
  await page
    .locator('nucleo-variante-form')
    .getByRole('textbox', { name: 'Talla', exact: true })
    .fill('Unidad 50m');
  await page
    .locator('nucleo-variante-form')
    .getByRole('textbox', { name: 'Color', exact: true })
    .fill('Azul');
  await capturarPantalla50m(page, 'variante-formulario');
  await page
    .getByRole('button', { name: 'Crear variante', exact: true })
    .click();
  await expect(page.locator('nucleo-variante-form')).toBeHidden();
  await expect(
    page.getByText('Unidad 50m / Azul', { exact: false }).first(),
  ).toBeVisible();
  await capturarPantalla50m(page, 'producto-general-variantes');
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(page.locator('ui-confirm-dialog')).toBeVisible();
  await capturarPantalla50m(page, 'variante-desactivar');
  await page.locator('ui-confirm-dialog [data-cancelar]').click();
  await expect(page.locator('ui-confirm-dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(
    page
      .locator('nucleo-variante-form')
      .getByRole('textbox', { name: 'Talla', exact: true }),
  ).toHaveValue('Unidad 50m');
  await capturarPantalla50m(page, 'variante-editar');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Guardar cambios', exact: true })
    .click();
  await expect(page.locator('nucleo-variante-form')).toBeHidden();
  await page.getByRole('button', { name: /Registrar compra$/ }).click();
  await capturarPantalla50m(page, 'compra-nueva');
  await page.getByRole('button', { name: /Nuevo proveedor$/ }).click();
  await capturarPantalla50m(page, 'proveedor-nuevo');
  const proveedor = 'Proveedor 50m ' + Date.now();
  await page
    .locator('nucleo-proveedor-form')
    .getByRole('textbox', { name: /^Razón social/ })
    .fill(proveedor);
  await capturarPantalla50m(page, 'proveedor-formulario');
  await page
    .getByRole('button', { name: 'Crear proveedor', exact: true })
    .click();
  await expect(page.locator('nucleo-proveedor-form')).toBeHidden();
  const compra = page.locator('nucleo-compra-form');
  await compra.getByRole('combobox').click();
  await page.getByRole('option', { name: proveedor, exact: true }).click();
  await compra.getByRole('textbox', { name: /^Cantidad/ }).fill('3');
  await compra.getByRole('textbox', { name: /^Precio de compra/ }).fill('5');
  await compra.getByRole('textbox', { name: /comprobante/ }).fill('COMPRA-50M');
  await capturarPantalla50m(page, 'compra-formulario');
  await compra
    .getByRole('button', { name: 'Registrar compra', exact: true })
    .click();
  await expect(compra).toBeHidden();
  prepararStockBajo50m(Number(new URL(detalle).pathname.split('/').pop()));
  await page.reload();
  await expect(page).toHaveURL(detalle);
  await expect(page.getByRole('textbox', { name: /^Nombre/ })).toHaveValue(
    nombre,
  );
  await capturarPantalla50m(page, 'producto-general-stock');
  await expect(page.locator('ui-alert.ui-alert--peligro')).toHaveCount(1);
  await expect(page.locator('ui-alert.ui-alert--peligro')).toContainText(
    'Norte 50m (0 de 2)',
  );
  await page.getByRole('button', { name: /Nueva variante$/ }).click();
  await page
    .locator('nucleo-variante-form')
    .getByRole('textbox', { name: 'Talla', exact: true })
    .fill('Extra 50m');
  await page
    .getByRole('button', { name: 'Crear variante', exact: true })
    .click();
  await expect(page.locator('nucleo-variante-form')).toBeHidden();
  await page.getByRole('tab', { name: /Kardex/ }).click();
  await expect(
    page
      .locator('nucleo-kardex-list')
      .getByRole('cell', { name: 'compra', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator('nucleo-kardex-list')
      .getByRole('cell', { name: '3', exact: true }),
  ).toHaveCount(2);
  await capturarPantalla50m(page, 'producto-kardex');
  await page.getByRole('combobox', { name: 'Variante', exact: true }).click();
  await expect(
    page.getByRole('option', { name: 'Todas', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('option', { name: 'Extra 50m', exact: true }).click();
  await expect(page.locator('nucleo-kardex-list ui-empty')).toBeVisible();
  await capturarPantalla50m(page, 'producto-kardex-vacio');
  await page.getByRole('tab', { name: /Auditoría/ }).click();
  await expect(page.locator('nucleo-audit-log-viewer')).toBeVisible();
  await capturarPantalla50m(page, 'producto-auditoria');
  await abrirPantalla(page, '/inventario');
  await page.getByPlaceholder('Buscar por nombre...').fill(nombre);
  await expect(
    page.getByRole('cell', { name: nombre, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Desactivar', exact: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(page.locator('ui-confirm-dialog')).toBeVisible();
  await capturarPantalla50m(page, 'producto-desactivar');
  await page.locator('ui-confirm-dialog [data-cancelar]').click();
  await expect(page.locator('ui-confirm-dialog')).toBeHidden();
  await page
    .getByPlaceholder('Buscar por nombre...')
    .fill('PRODUCTO-INEXISTENTE-50M');
  await expect(page.locator('ui-empty')).toBeVisible();
  await capturarPantalla50m(page, 'productos-vacio');
  // El 404 solicitado verifica la página de error y su reintento.
  await page.goto('/inventario/productos/2147483647');
  await expect(
    page.getByRole('button', { name: 'Reintentar', exact: true }),
  ).toBeVisible();
  await capturarPantalla50m(page, 'producto-404');
  sinErrores(errores, 'inventario productos', [
    'GET /api/v1/productos/2147483647 -> 404',
  ]);
});
