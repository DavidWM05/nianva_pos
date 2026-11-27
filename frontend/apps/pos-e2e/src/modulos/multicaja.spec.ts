import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect as comprobar, test, type Page } from '@playwright/test';

import { crearSupervisor, prepararSucursalMulticaja } from '../soporte/backend';
import { iniciarSesion } from '../soporte/sesion';
import { autorizarComoSupervisora as autorizarSupervisora, PIN_SUPERVISORA } from '../soporte/supervisor';

const expect = comprobar.configure({ timeout: 25000 });
const operador = 'multicaja@e2e.test';
const norte = 'Terminal Norte';
const sur = 'Terminal Sur';
const supervisora = 'Supervisora Multicaja';
const autorizarComoSupervisora = (page: Page) => autorizarSupervisora(page, PIN_SUPERVISORA, supervisora);

test.beforeAll(() => {
  prepararSucursalMulticaja(operador, [norte, sur]);
  crearSupervisor(operador, 'supervisora-multicaja@e2e.test', supervisora, PIN_SUPERVISORA);
});

async function elegirTerminal(page: Page, nombre: string): Promise<void> {
  await iniciarSesion(page, operador);
  await page.goto('/perfil/preferencias');
  await page.getByRole('combobox', { name: 'Elegir terminal' }).selectOption({ label: nombre });
  await page.getByRole('button', { name: 'Cambiar terminal' }).click();
  await expect(page.getByText('Terminal actual: ' + nombre)).toBeVisible();
  await page.goto('/tpv/caja');
}

async function abrir(page: Page, monto: string, tarde = false): Promise<void> {
  await page.getByLabel('Monto de apertura').fill(monto);
  await page.getByRole('button', { name: 'Abrir caja' }).click();
  if (tarde) expect(await autorizarComoSupervisora(page)).toBe(201);
  await expect(page.getByRole('heading', { name: 'Caja abierta', exact: true })).toBeVisible();
}

async function cobrar(page: Page): Promise<number> {
  await page.goto('/tpv/venta');
  const producto = page.locator('nucleo-entidad-selector').filter({ has: page.getByText('Producto', { exact: true }) });
  const opciones = producto.getByRole('combobox');
  await opciones.first().fill('Agua 1L');
  await page.getByRole('option', { name: 'Agua 1L', exact: true }).click();
  await expect(opciones).toHaveCount(2, { timeout: 20000 });
  await opciones.nth(1).click();
  await page.getByRole('option').first().click();
  await page.getByRole('button', { name: /Agregar línea$/ }).click();
  const total = page.locator('.venta__total');
  await expect(total).toContainText(/\$[1-9]/);
  const importe = Number((await total.innerText()).replace(/[^0-9.]/g, ''));
  const pagos = page.locator('nucleo-lineas-pago');
  await pagos.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  await pagos.getByPlaceholder('Monto', { exact: true }).first().fill(importe.toFixed(2));
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  await expect(page.getByRole('heading', { name: /Venta .* registrada/ })).toBeVisible();
  return Math.round(importe * 100);
}

async function capturas(page: Page, nombre: string, ver: () => Promise<void>): Promise<void> {
  const salida = process.env['POS_E2E_MULTICAJA_CAPTURAS'] ?? test.info().outputPath('capturas');
  await mkdir(salida, { recursive: true });
  for (const tema of ['claro', 'oscuro']) {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((valor) => localStorage.setItem('nv-tema', valor), tema);
      await ver();
      const html = page.locator('html');
      if (tema === 'oscuro') await expect(html).toHaveClass(/nv-tema-oscuro/);
      else await expect(html).not.toHaveClass(/nv-tema-oscuro/);
      await page.screenshot({ path: path.join(salida, [nombre, tema, width].join('-') + '.png'), fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

test('dos terminales cobran y cierran en un original y un complementario', async ({ page, browser, baseURL }) => {
  test.setTimeout(240000);
  const contextoSur = await browser.newContext({ baseURL });
  try {
    const paginaSur = await contextoSur.newPage();
    await elegirTerminal(page, norte);
    await elegirTerminal(paginaSur, sur);
    await abrir(page, '100');
    await abrir(paginaSur, '200');
    const contadoNorte = 10000 + await cobrar(page);
    const contadoSur = 20000 + await cobrar(paginaSur);
    const decimal = (centavos: number) => (centavos / 100).toFixed(2);

    const verRemotas = async () => {
      const respuesta = page.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/caja/remotas');
      await page.goto('/tpv/caja/remotas');
      const { data } = await (await respuesta).json();
      expect(data[0].metodos[0]).not.toHaveProperty('total_teorico');
      expect(data[0].metodos[0]).not.toHaveProperty('diferencia');
      await expect(page.getByRole('heading', { name: sur, exact: true })).toBeVisible();
      await expect(page.getByText(/^Teórico|^Diferencia/)).toHaveCount(0);
      if (page.viewportSize()?.width === 1280) {
        await expect(page.locator('nucleo-sidebar a[href="/tpv/caja"]')).not.toHaveClass(/sidebar__link--active/);
        await expect(page.getByRole('link', { name: 'Cierre remoto de caja' })).toHaveClass(/sidebar__link--active/);
      }
    };
    await verRemotas();
    const fecha = (await page.getByText(/^Fecha operativa /).innerText()).replace('Fecha operativa ', '');
    await capturas(page, 'cajas-remotas', verRemotas);
    await page.getByLabel('Conteo real · Efectivo').fill(decimal(contadoSur));
    await page.getByRole('button', { name: 'Cerrar caja' }).click();
    expect(await autorizarComoSupervisora(page)).toBe(201);
    await expect(page.getByText(/^Corte .* registrado\.$/)).toBeVisible();
    await expect(page.locator('dl')).toContainText(decimal(contadoSur));
    await expect(page.locator('dl')).toContainText('Diferencia');

    async function cortarLocal(monto: string): Promise<void> {
      await page.goto('/tpv/caja');
      await expect(page.getByText(/^Teórico:/)).toBeVisible();
      await page.getByLabel('Contado · Efectivo').fill(monto);
      await page.getByRole('button', { name: 'Cerrar caja' }).click();
      await expect(page.getByRole('heading', { name: 'Caja cerrada', exact: true })).toBeVisible();
    }
    async function consolidar(): Promise<void> {
      await page.goto('/tpv/caja/consolidado');
      if (page.viewportSize()?.width === 1280) {
        await expect(page.locator('nucleo-sidebar a[href="/tpv/caja"]')).not.toHaveClass(/sidebar__link--active/);
        await expect(page.getByRole('link', { name: 'Consolidado de caja' })).toHaveClass(/sidebar__link--active/);
      }
      await page.getByLabel('Fecha operativa').fill(fecha);
      await page.getByRole('button', { name: 'Consolidar', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Consolidado original' })).toBeVisible();
    }

    await cortarLocal(decimal(contadoNorte));
    await consolidar();
    await expect(page.getByRole('region', { name: /Total del día/ })).toContainText(decimal(contadoNorte + contadoSur));
    await page.goto('/tpv/caja');
    await abrir(page, '50', true);
    await cortarLocal('50');
    await consolidar();
    await expect(page.getByRole('heading', { name: 'Consolidado complementario' })).toBeVisible();
    await expect(page.getByRole('region', { name: /Total del día/ })).toContainText(decimal(contadoNorte + contadoSur + 5000));
    await capturas(page, 'consolidado', async () => {
      await page.goto('/tpv/caja/consolidado');
      if (page.viewportSize()?.width === 1280) {
        await expect(page.locator('nucleo-sidebar a[href="/tpv/caja"]')).not.toHaveClass(/sidebar__link--active/);
        await expect(page.getByRole('link', { name: 'Consolidado de caja' })).toHaveClass(/sidebar__link--active/);
      }
      await page.getByLabel('Fecha operativa').fill(fecha);
      await page.getByRole('button', { name: 'Consultar' }).click();
      await expect(page.getByRole('heading', { name: 'Consolidado complementario' })).toBeVisible();
    });
  } finally {
    await contextoSur.close();
  }
});
