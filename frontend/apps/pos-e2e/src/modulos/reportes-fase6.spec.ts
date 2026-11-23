import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { prepararReportes } from '../soporte/reportes';
import { iniciarSesion } from '../soporte/sesion';

test.beforeAll(prepararReportes);

test('reportes de ventas filtra por periodo y sucursal, pagina, grafica y exporta todos los detalles filtrados', async ({ page }) => {
  await iniciarSesion(page, 'gerente-reportes@e2e.test');
  await page.goto('/reportes/ventas');
  const filtros = page.locator('ui-report-filtros');
  await expect(filtros).toBeVisible();
  await filtros.getByRole('combobox', { name: 'Sucursal' }).click();
  await page.getByRole('option', { name: 'Centro reportes' }).click();
  const desde = filtros.getByRole('textbox', { name: 'Desde' });
  const hasta = filtros.getByRole('textbox', { name: 'Hasta' });
  await desde.fill('2024-06-14');
  await desde.press('Tab');
  await hasta.fill('2024-06-14');
  await hasta.press('Tab');
  await filtros.getByRole('button', { name: 'Filtrar' }).click();

  const grafica = page.getByRole('figure', { name: 'Ventas por día' });
  await expect(grafica.getByRole('listitem')).toHaveCount(1);
  await expect(grafica).toContainText('$337.50');
  const detalle = page.getByRole('heading', { name: 'Operaciones del periodo' }).locator('..');
  await expect(detalle.getByText('V-F6-27', { exact: true })).toBeVisible();
  await expect(detalle.getByText('V-F6-1', { exact: true })).toHaveCount(0);
  await detalle.getByRole('button', { name: 'Página siguiente' }).click();
  await expect(detalle.getByText('V-F6-1', { exact: true })).toBeVisible();
  await expect(detalle.getByText('$337.50', { exact: true })).toBeVisible();

  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/\.csv$/);
  const csv = await readFile((await archivo.path())!, 'utf8');
  expect(csv).toContain('tipo,folio,fecha,importe_comercial');
  expect(csv).toContain('venta,V-F6-27,');
  expect(csv).toContain('venta,V-F6-1,');
  expect(csv).toContain('totales.vendido,337.50');
  expect(csv).not.toContain('V-F6-FUERA');
  expect(csv).not.toContain('V-F6-NORTE');
});

test('reportes respeta el permiso de lectura y oculta Exportar al lector sin el permiso', async ({ page, browser }) => {
  await iniciarSesion(page, 'lector-reportes@e2e.test');
  await page.goto('/reportes/ventas');
  await expect(page.getByRole('figure', { name: 'Ventas por día' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar' })).toHaveCount(0);
  await expect(page.locator('ui-report-filtros').getByRole('combobox', { name: 'Sucursal' })).toHaveCount(0);
  const puerto = process.env['POS_E2E_BACKEND_PORT'] ?? '8100';
  const status = await page.evaluate(async (puertoApi) => {
    const respuesta = await fetch('http://127.0.0.1:' + puertoApi + '/api/v1/ventas/reporte/exportar', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return respuesta.status;
  }, puerto);
  expect(status).toBe(403);

  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const sinPermiso = await contexto.newPage();
    await iniciarSesion(sinPermiso, 'sin-reportes@e2e.test');
    const peticion = sinPermiso.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/ventas/reporte');
    await sinPermiso.goto('/reportes/ventas');
    expect((await peticion).status()).toBe(403);
    await expect(sinPermiso.locator('ui-report').getByRole('alert')).toBeVisible();
    await expect(sinPermiso.getByRole('button', { name: 'Exportar' })).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});
