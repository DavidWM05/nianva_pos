import { expect, test } from '@playwright/test';

// 49e: con MatSelect, el selector se veia vacio con "Todas" (null) y media 56 px, desalineado
// de los inputs de al lado en la barra de filtros del reporte.
test('el selector de sucursal muestra Todas y mide lo mismo que el input de periodo', async ({ page }) => {
  await page.goto('/report?tema=claro');
  await page.waitForLoadState('networkidle');

  const selector = page.locator('ui-report-filtros ui-select-filtro').first();
  const periodo = page.locator('ui-report-filtros input').first();

  await expect(selector.getByRole('combobox')).toHaveText('Todas');

  const altoSelector = (await selector.boundingBox())?.height ?? 0;
  const altoPeriodo = (await periodo.boundingBox())?.height ?? 0;
  expect(Math.abs(altoSelector - altoPeriodo), `selector ${altoSelector} px, periodo ${altoPeriodo} px`).toBeLessThanOrEqual(2);
});

test('en /forms el selector se nombra por la etiqueta de ui-campo', async ({ page }) => {
  await page.goto('/forms?tema=claro');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('combobox', { name: 'Sucursal' })).toHaveText('Todas');
});
