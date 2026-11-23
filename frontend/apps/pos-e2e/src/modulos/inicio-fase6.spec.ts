import { expect, test } from '@playwright/test';
import { iniciarSesion } from '../soporte/sesion';

test('Inicio muestra las métricas, la serie de siete días y los bloques operativos', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  await page.goto('/nucleo');
  const tarjetas = page.getByRole('heading', { name: 'Resumen del día' }).locator('..');
  for (const etiqueta of ['Ventas de hoy', 'Tickets de hoy', 'Gastos de hoy', 'Ingresos del mes', 'Catálogo activo', 'Stock bajo']) {
    await expect(tarjetas.getByText(etiqueta, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('figure', { name: 'Ventas de los últimos 7 días' }).getByRole('listitem')).toHaveCount(7);
  await expect(page.getByRole('heading', { name: 'Productos más vendidos por variante' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Caja', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Apartados por vencer/ })).toBeVisible();
});
