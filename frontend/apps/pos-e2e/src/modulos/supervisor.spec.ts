import { expect, test, type Page } from '@playwright/test';

import { asegurarCajaAbierta } from '../soporte/api';
import { agregarAgua50f } from '../soporte/flujo-50f';
import { abrirPantalla, sinViolacionesSerias } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';
import { PIN_SUPERVISORA, autorizarComoSupervisora, dialogoSupervisor, prepararSupervisora } from '../soporte/supervisor';

// Fase 4, B2 (SEG-05, F4-7): con SUPERVISOR_EXIGIR, el servidor responde supervisor_requerido y la
// pantalla pide la autorizacion: se elige al supervisor (GET /supervisores), se escribe su PIN y
// la operacion se reintenta con la misma Idempotency-Key y el token. Montos claramente arriba de
// los umbrales que llegan con A5 (descuento de 60 MXN contra 50).
const VENDEDOR = 'vendedor@abarrotes.test';
const API = 'http://127.0.0.1:' + (process.env['POS_E2E_BACKEND_PORT'] ?? '8100') + '/api/v1';

const dialogo = dialogoSupervisor;
const autorizar = autorizarComoSupervisora;

test.beforeAll(() => {
  prepararSupervisora();
});

test.afterEach(async ({ page }) => {
  await asegurarCajaAbierta(page);
});

/** Una linea de Agua 1L con la cantidad dada, el descuento dado y el pago en efectivo por el total. */
async function capturarVenta(page: Page, cantidad: number, descuento: number | null): Promise<void> {
  await agregarAgua50f(page);
  if (cantidad !== 1) {
    await page.getByRole('spinbutton', { name: /^Cantidad de Agua 1L/ }).fill(String(cantidad));
    await page.keyboard.press('Tab');
  }
  await expect(page.locator('.venta__total')).not.toHaveText(/\$0\.00/, { timeout: 20000 });
  if (descuento !== null) {
    await page.locator('.venta__totales').getByRole('textbox', { name: /^Descuento/ }).fill(String(descuento));
    await page.keyboard.press('Tab');
  }
  const pagos = page.locator('nucleo-lineas-pago');
  await pagos.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  const monto = pagos.getByPlaceholder('Monto', { exact: true }).first();
  const registrar = page.getByRole('button', { name: /Registrar venta$/ });
  // Agregar la línea y cambiar la cantidad piden cada una POST /ventas/cotizar, y el total cambia
  // cuando llega cada respuesta, en cualquier orden. Se vuelve a leer el total hasta que el pago
  // cuadra, en lugar de esperar una respuesta concreta.
  await expect(async () => {
    const total = (await page.locator('.venta__total').textContent())?.replace(/[^0-9.]/g, '') ?? '';
    await monto.fill(total);
    await expect(registrar).toBeEnabled({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

async function abrirVenta(page: Page): Promise<void> {
  await iniciarSesion(page, VENDEDOR);
  await asegurarCajaAbierta(page);
  await abrirPantalla(page, '/tpv/venta');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible({ timeout: 20000 });
}

test('venta con descuento fuera de margen: pide supervisor, un PIN incorrecto no autoriza y con el correcto se registra con su descuento', async ({ page }) => {
  test.setTimeout(180000);
  await abrirVenta(page);
  await capturarVenta(page, 5, 60);

  const registro = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  expect((await registro).status()).toBe(403);
  await expect(dialogo(page)).toContainText('Aplicar un descuento fuera del margen requiere la autorización de un supervisor.');

  expect(await autorizar(page, '1111')).toBe(403);
  await expect(dialogo(page).getByRole('alert')).toHaveText('El supervisor o el PIN no son válidos.');

  const reintento = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  expect(await autorizar(page, PIN_SUPERVISORA)).toBe(201);
  const venta = await reintento;
  expect(venta.status()).toBe(201);
  expect(venta.request().headers()['x-autorizacion-supervisor']).toBeTruthy();
  const cuerpo = (await venta.json()) as { data: { descuento_manual: string } };
  expect(cuerpo.data.descuento_manual).toBe('60.00');
  await expect(page.getByRole('heading', { name: /^Venta V-\d+-\d+ registrada$/ })).toBeVisible();
});

test('anular una venta pide supervisor y queda anulada', async ({ page }) => {
  test.setTimeout(180000);
  await abrirVenta(page);
  await capturarVenta(page, 1, null);
  const registro = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  const { data } = (await (await registro).json()) as { data: { id: string } };

  await abrirPantalla(page, '/tpv/ventas');
  const fila = page.locator('tbody tr').first();
  await fila.getByRole('button', { name: 'Anular' }).click();
  await page.getByLabel('Motivo').fill('Error de captura');
  await page.getByRole('button', { name: 'Confirmar anulación' }).click();

  expect(await autorizar(page, PIN_SUPERVISORA)).toBe(201);
  await expect(page.getByText('Venta anulada.')).toBeVisible({ timeout: 20000 });
  const estado = await page.evaluate(
    async ({ api, id }) => ((await (await fetch(`${api}/ventas/${id}`, { credentials: 'include', headers: { Accept: 'application/json' } })).json()) as { data: { estado: string } }).data.estado,
    { api: API, id: data.id },
  );
  expect(estado).toBe('anulada');
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`axe en tema ${tema}, a 1280 y 390 px: el dialogo del supervisor, con y sin error`, async ({ page }) => {
    test.setTimeout(180000);
    await page.addInitScript((valor) => localStorage.setItem('nv-tema', valor), tema);
    await abrirVenta(page);
    await capturarVenta(page, 5, 60);
    await page.getByRole('button', { name: /Registrar venta$/ }).click();
    await expect(dialogo(page)).toBeVisible({ timeout: 20000 });

    for (const ancho of [1280, 390]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await sinViolacionesSerias(page);
    }
    await dialogo(page).getByRole('button', { name: 'Autorizar' }).click();
    // Sin supervisor elegido o sin PIN completo, el dialogo lo dice en su region de alerta.
    await expect(dialogo(page).getByRole('alert')).toContainText(/Elige al supervisor|de 4 a 6 dígitos/);
    await sinViolacionesSerias(page);

    await dialogo(page).getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo(page)).toHaveCount(0);
  });
}
