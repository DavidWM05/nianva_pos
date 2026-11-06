import { expect, test } from '@playwright/test';

// 49g: con matSort, la flecha de una columna ordenable solo aparecia al pasar el mouse o al
// ordenarla. Con p-table se veia siempre, y es lo que indica qué columnas se pueden ordenar.
test('las columnas ordenables muestran su flecha aunque no esten ordenadas', async ({ page }) => {
  await page.goto('/data?tema=claro');
  await page.waitForLoadState('networkidle');

  const flecha = page.locator('ui-tabla th[aria-sort="none"] .mat-sort-header-arrow').first();
  const opacidad = await flecha.evaluate((elemento) => Number(getComputedStyle(elemento).opacity));

  expect(opacidad).toBeGreaterThan(0.3);
});
