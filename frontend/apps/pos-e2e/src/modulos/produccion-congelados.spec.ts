import { capturarPantalla50l } from '../soporte/capturas-50l';
import {
  expect,
  test,
  type Response,
  type Locator,
  type Page,
} from '@playwright/test';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';
import { prepararDatos50l } from '../soporte/datos-50l';

async function elegir(
  page: Page,
  alcance: Locator,
  texto: string,
): Promise<void> {
  await page.waitForLoadState('networkidle');
  const entrada = alcance.locator('input[role=combobox]');
  await entrada.click();
  await entrada.pressSequentially(texto);
  await expect(entrada).toHaveValue(texto);
  await expect(
    page.getByRole('option', { name: texto, exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole('option', { name: texto, exact: true }).click();
}
async function elegirVariante(
  page: Page,
  alcance: Locator,
  texto: string,
): Promise<void> {
  await elegir(page, alcance, texto);
  await alcance.getByRole('combobox').nth(1).click();
  await page.getByRole('option').first().click();
}
const selector = (page: Page, etiqueta: string) =>
  page
    .locator('nucleo-entidad-selector')
    .filter({ has: page.getByText(etiqueta, { exact: true }) });

test('50l producción: crear insumo y receta, registrar orden y transformación', async ({
  page,
}) => {
  test.setTimeout(600000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const datos = prepararDatos50l();
  const errores = vigilarErrores(page);
  const insumo = 'Insumo 50l ' + Date.now(),
    receta = 'Receta 50l ' + Date.now();
  await abrirPantalla(page, '/produccion/insumos');
  await capturarPantalla50l(page, 'insumos-vacio');
  await page.getByRole('button', { name: /Nuevo insumo$/ }).click();
  await capturarPantalla50l(page, 'insumos-alta');
  await page.getByLabel('Nombre', { exact: true }).fill(insumo);
  await elegir(page, selector(page, 'Unidad de medida'), datos.unidad);
  await capturarPantalla50l(page, 'insumos-captura');
  const creado = await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Registrar insumo$/ }),
    'POST',
    /^\/api\/v1\/insumos$/,
  );
  expect(creado.status()).toBe(201);
  const insumoCreado = await creado.json();
  const stock = await page.evaluate(
    async ({ id, puerto }) => {
      const token =
        document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1] ?? '';
      const r = await fetch(
        'http://127.0.0.1:' + puerto + '/api/v1/insumos/' + id + '/stocks',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(token),
          },
          body: JSON.stringify({ cantidad: 100 }),
        },
      );
      return { status: r.status, cuerpo: await r.json() };
    },
    {
      id: insumoCreado.data.id,
      puerto: process.env['POS_E2E_BACKEND_PORT'] ?? '8100',
    },
  );
  expect(stock.status, JSON.stringify(stock.cuerpo)).toBe(201);
  await expect(
    page.getByRole('cell', { name: insumo, exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'insumos-listado');
  await abrirPantalla(page, '/produccion/recetas');
  await capturarPantalla50l(page, 'recetas-vacio');
  await page.getByRole('button', { name: /Nueva receta$/ }).click();
  await capturarPantalla50l(page, 'recetas-alta');
  await elegirVariante(page, selector(page, 'Producto'), datos.destino);
  await page.getByLabel('Nombre', { exact: true }).fill(receta);
  await elegir(page, selector(page, 'Insumo'), insumo);
  await page.getByLabel('Cantidad', { exact: true }).fill('1');
  await elegir(page, selector(page, 'Unidad'), datos.unidad);
  await page.getByRole('button', { name: /Agregar ingrediente$/ }).click();
  await expect(
    page.getByRole('cell', { name: insumo, exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'recetas-captura');
  await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Crear receta$/ }),
    'POST',
    /^\/api\/v1\/recetas$/,
  );
  await expect(page).toHaveURL(/\/produccion\/recetas$/);
  await expect(
    page.getByRole('cell', { name: receta, exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'recetas-listado');
  await abrirPantalla(page, '/produccion/ordenes');
  await capturarPantalla50l(page, 'ordenes-vacio');
  await page.getByRole('button', { name: /Nueva orden$/ }).click();
  await capturarPantalla50l(page, 'ordenes-alta');
  await elegir(page, selector(page, 'Receta'), receta);
  await page.getByLabel('Cantidad programada', { exact: true }).fill('2');
  await capturarPantalla50l(page, 'ordenes-captura');
  await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Crear orden$/ }),
    'POST',
    /^\/api\/v1\/ordenes-produccion$/,
  );
  await expect(
    page.getByRole('cell', { name: receta, exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'ordenes-listado');
  const filaOrden = page.getByRole('row').filter({ hasText: receta });
  await filaOrden
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click();
  await expect(page.locator('ui-confirm-dialog')).toBeVisible();
  await capturarPantalla50l(page, 'ordenes-cancelar-confirmacion');
  await page.locator('ui-confirm-dialog [data-cancelar]').click();
  await filaOrden.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await expect(page.locator('ui-confirm-dialog')).toBeVisible();
  await capturarPantalla50l(page, 'ordenes-iniciar-confirmacion');
  await confirmarOperacion(
    page,
    page
      .locator('ui-confirm-dialog')
      .getByRole('button', { name: 'Aceptar', exact: true }),
    'PATCH',
    /^\/api\/v1\/ordenes-produccion\/\d+\/estado$/,
  );
  await expect(filaOrden).toContainText('En proceso');
  await capturarPantalla50l(page, 'ordenes-en-proceso');
  await filaOrden
    .getByRole('button', { name: 'Completar', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Completar orden', exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'ordenes-completar');
  await confirmarOperacion(
    page,
    page
      .getByRole('dialog', { name: 'Completar orden', exact: true })
      .getByRole('button', { name: 'Completar', exact: true }),
    'PATCH',
    /^\/api\/v1\/ordenes-produccion\/\d+\/estado$/,
  );
  await expect(filaOrden).toContainText('Completada');
  await capturarPantalla50l(page, 'ordenes-completada');
  await abrirPantalla(page, '/produccion/transformaciones');
  await capturarPantalla50l(page, 'transformaciones-vacio');
  await page.getByRole('button', { name: /Nueva transformación$/ }).click();
  await capturarPantalla50l(page, 'transformaciones-alta');
  await elegirVariante(
    page,
    page.locator('nucleo-entidad-selector').nth(0),
    datos.origen,
  );
  await page.getByLabel('Cantidad a consumir', { exact: true }).fill('2');
  await elegirVariante(
    page,
    page.locator('nucleo-entidad-selector').nth(1),
    datos.destino,
  );
  await page.getByLabel('Cantidad a producir', { exact: true }).fill('1');
  await capturarPantalla50l(page, 'transformaciones-captura');
  const transformacion = await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Registrar transformación$/ }),
    'POST',
    /^\/api\/v1\/transformaciones$/,
  );
  expect(transformacion.status()).toBe(201);
  const resultado = await transformacion.json();
  await expect(page).toHaveURL(/\/produccion\/transformaciones$/);
  await expect(
    page.getByRole('cell', {
      name: 'Variante #' + resultado.data.variante_origen_id,
      exact: true,
    }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'transformaciones-listado');
  sinErrores(errores, '50l producción');
});

test('50l delivery: crear pedido y ver su detalle', async ({ page }) => {
  test.setTimeout(600000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/pedidos');
  await capturarPantalla50l(page, 'pedidos-vacio');
  await page.getByRole('button', { name: /Nuevo pedido$/ }).click();
  await capturarPantalla50l(page, 'pedidos-alta');
  await elegir(page, selector(page, 'Cliente'), 'Cliente Abarrotes 1');
  await page
    .getByLabel('Dirección de entrega (opcional)', { exact: true })
    .fill('Calle 50l, 123');
  await capturarPantalla50l(page, 'pedidos-captura');
  await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Crear pedido$/ }),
    'POST',
    /^\/api\/v1\/pedidos$/,
  );
  await expect(page).toHaveURL(/\/pedidos\/\d+$/);
  await expect(page.getByText('Calle 50l, 123', { exact: true })).toBeVisible();
  await capturarPantalla50l(page, 'pedidos-detalle');
  await auditarRegistro(page, 'pedidos');
  await abrirPantalla(page, '/pedidos');
  await capturarPantalla50l(page, 'pedidos-listado');
  sinErrores(errores, '50l delivery');
});

test('50l payroll: crear empleado, generar nómina y ver ambos detalles', async ({
  page,
}) => {
  test.setTimeout(600000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const datos = prepararDatos50l();
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/payroll/empleados');
  await capturarPantalla50l(page, 'empleados-vacio');
  await page.getByRole('button', { name: /Nuevo empleado$/ }).click();
  await capturarPantalla50l(page, 'empleados-alta');
  await capturarCalendario(
    page,
    'Fecha de ingreso (opcional)',
    'empleados-calendario',
  );
  await elegir(page, selector(page, 'Usuario'), datos.empleado);
  await page.getByLabel('Salario base', { exact: true }).fill('1500');
  await capturarPantalla50l(page, 'empleados-captura');
  await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Registrar empleado$/ }),
    'POST',
    /^\/api\/v1\/empleados$/,
  );
  const fila = page.getByRole('row').filter({ hasText: datos.empleado });
  await expect(fila).toBeVisible();
  await capturarPantalla50l(page, 'empleados-listado');
  await fila.getByRole('button').click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/payroll\/empleados\/\d+$/);
  await expect(
    page.getByRole('heading', { name: datos.empleado, exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'empleados-detalle');
  await auditarRegistro(page, 'empleados');
  await abrirPantalla(page, '/payroll/nominas');
  await capturarPantalla50l(page, 'nominas-vacio');
  await page.getByRole('button', { name: /Generar nómina$/ }).click();
  await capturarPantalla50l(page, 'nominas-alta');
  await capturarCalendario(
    page,
    'Periodo — inicio',
    'nominas-calendario-inicio',
  );
  await capturarCalendario(page, 'Periodo — fin', 'nominas-calendario-fin');
  await page
    .getByLabel('Periodo — inicio', { exact: true })
    .pressSequentially('2026-01-01');
  await page.getByLabel('Periodo — inicio', { exact: true }).press('Tab');
  await page
    .getByLabel('Periodo — fin', { exact: true })
    .pressSequentially('2026-01-15');
  await page.getByLabel('Periodo — fin', { exact: true }).press('Tab');
  await capturarPantalla50l(page, 'nominas-captura');
  await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Generar$/ }),
    'POST',
    /^\/api\/v1\/nominas\/generar$/,
  );
  await expect(
    page.locator('tbody tr').getByRole('button').first(),
  ).toBeVisible();
  await capturarPantalla50l(page, 'nominas-listado');
  await page.locator('tbody tr').getByRole('button').first().click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/payroll\/nominas\/\d+$/);
  await expect(page.getByText(datos.empleado, { exact: true })).toBeVisible();
  await capturarPantalla50l(page, 'nominas-detalle');
  await auditarRegistro(page, 'nominas');
  await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Marcar como pagada$/ }),
    'PATCH',
    /^\/api\/v1\/nominas\/\d+\/pagar$/,
  );
  await expect(
    page.getByRole('button', { name: /Marcar como pagada$/ }),
  ).toHaveCount(0);
  await capturarPantalla50l(page, 'nominas-pagada');
  sinErrores(errores, '50l payroll');
});

test('50l préstamos: crear préstamo y ver su detalle', async ({ page }) => {
  test.setTimeout(600000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  const referencia = 'Préstamo 50l ' + Date.now();
  await abrirPantalla(page, '/prestamos');
  await capturarPantalla50l(page, 'prestamos-vacio');
  await page.getByRole('button', { name: /Nuevo préstamo$/ }).click();
  await capturarPantalla50l(page, 'prestamos-alta');
  await capturarCalendario(page, 'Fecha del préstamo', 'prestamos-calendario');
  await capturarCalendario(
    page,
    'Fecha de vencimiento (opcional)',
    'prestamos-calendario-vencimiento',
  );
  await page
    .getByLabel('Referencia (nombre de la persona o entidad, opcional)', {
      exact: true,
    })
    .fill(referencia);
  await page.getByLabel('Monto', { exact: true }).fill('100');
  await capturarPantalla50l(page, 'prestamos-captura');
  const prestamoCreado = await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Registrar préstamo$/ }),
    'POST',
    /^\/api\/v1\/prestamos$/,
  );
  expect(prestamoCreado.status()).toBe(201);
  await expect(page).toHaveURL(/\/prestamos$/);
  const fila = page.getByRole('row').filter({ hasText: referencia });
  await expect(fila).toBeVisible();
  await capturarPantalla50l(page, 'prestamos-listado');
  await fila.getByRole('button').click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/prestamos\/\d+$/);
  await expect(
    page.getByRole('heading', { name: referencia, exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'prestamos-detalle');
  await auditarRegistro(page, 'prestamos');
  await page.getByRole('button', { name: /Registrar pago$/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Registrar pago', exact: true }),
  ).toBeVisible();
  await capturarPantalla50l(page, 'prestamos-pago');
  await page.getByLabel('Monto a pagar', { exact: true }).fill('10');
  await capturarPantalla50l(page, 'prestamos-pago-captura');
  await confirmarOperacion(
    page,
    page.getByRole('button', { name: /Confirmar pago$/ }),
    'POST',
    /^\/api\/v1\/prestamos\/\d+\/pagos$/,
  );
  await expect(
    page.getByRole('dialog', { name: 'Registrar pago', exact: true }),
  ).toBeHidden();
  await capturarPantalla50l(page, 'prestamos-pago-registrado');
  sinErrores(errores, '50l préstamos');
});

async function auditarRegistro(page: Page, nombre: string): Promise<void> {
  await expect(page.locator('nucleo-audit-log-viewer')).toHaveCount(0);
  await page.getByRole('tab', { name: /Auditoría/ }).click();
  await expect(page.locator('nucleo-audit-log-viewer')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('nucleo-audit-log-viewer ui-skeleton')).toHaveCount(
    0,
  );
  await capturarPantalla50l(page, nombre + '-auditoria');
  await page.getByRole('tab').first().click();
}
async function capturarCalendario(
  page: Page,
  etiqueta: string,
  nombre: string,
): Promise<void> {
  const modalesAntes = await page.locator('mat-dialog-container').count();
  const campo = page
    .locator('ui-campo')
    .filter({ has: page.getByText(etiqueta, { exact: true }) });
  await campo.locator('mat-datepicker-toggle button').click();
  await expect(page.locator('mat-datepicker-content')).toBeVisible();
  await capturarPantalla50l(page, nombre);
  await page.bringToFront();
  await expect(page.locator('mat-datepicker-content')).not.toHaveClass(
    /mat-datepicker-content-animating/,
  );
  if (modalesAntes > 0) {
    const controlCalendario = page
      .locator('mat-datepicker-content button')
      .first();
    await controlCalendario.focus();
    await expect(controlCalendario).toBeFocused();
    await page.keyboard.press('Escape');
  } else {
    const cerrarCalendario = page
      .locator('mat-datepicker-content')
      .getByRole('button', { name: 'Close calendar', exact: true });
    await cerrarCalendario.focus();
    await expect(cerrarCalendario).toBeFocused();
    await cerrarCalendario.press('Enter');
  }
  await expect(page.locator('mat-datepicker-content')).toBeHidden();
  await expect(page.locator('mat-dialog-container')).toHaveCount(modalesAntes);
}

async function confirmarOperacion(
  page: Page,
  boton: Locator,
  metodo: 'POST' | 'PATCH',
  ruta: RegExp,
): Promise<Response> {
  const terminada = page.waitForResponse(
    (r) =>
      r.request().method() === metodo && ruta.test(new URL(r.url()).pathname),
    { timeout: 30000 },
  );
  await boton.click();
  const respuesta = await terminada;
  await respuesta.finished();
  expect(respuesta.ok()).toBe(true);
  await page.waitForLoadState('networkidle');
  return respuesta;
}
