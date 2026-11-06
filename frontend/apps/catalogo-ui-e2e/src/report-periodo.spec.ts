import { expect, test } from '@playwright/test';

// 49f: con mat-date-range-input, el campo del periodo media 56 px con la etiqueta flotando
// dentro del borde, mientras el selector de sucursal de al lado mide como un input y lleva la
// etiqueta encima. Se compara la caja del campo, no el input interno.
test('el periodo y la sucursal tienen la misma caja y la etiqueta encima', async ({ page }) => {
  await page.goto('/report?tema=claro');
  await page.waitForLoadState('networkidle');

  const filtros = page.locator('ui-report-filtros').first();
  const periodo = await filtros.locator('.ui-report-filtros__fecha .mat-mdc-text-field-wrapper').boundingBox();
  const sucursal = await filtros.locator('ui-select-filtro .mat-mdc-text-field-wrapper').boundingBox();
  const etiqueta = await filtros.getByText('Periodo', { exact: true }).boundingBox();
  expect(periodo && sucursal && etiqueta).toBeTruthy();
  if (!periodo || !sucursal || !etiqueta) {
    return;
  }

  expect(Math.abs(periodo.height - sucursal.height), `periodo ${periodo.height} px, sucursal ${sucursal.height} px`).toBeLessThanOrEqual(2);
  expect(Math.abs(periodo.y - sucursal.y), `periodo en y=${periodo.y}, sucursal en y=${sucursal.y}`).toBeLessThanOrEqual(2);
  expect(etiqueta.y + etiqueta.height, 'la etiqueta queda encima del campo').toBeLessThanOrEqual(periodo.y);
});

test('el periodo se anuncia como grupo con su etiqueta', async ({ page }) => {
  await page.goto('/report?tema=claro');
  await page.waitForLoadState('networkidle');

  const filtros = page.locator('ui-report-filtros').first();

  await expect(filtros.getByRole('group', { name: 'Periodo' })).toBeVisible();
  await expect(filtros.getByRole('textbox', { name: 'Desde' })).toBeVisible();
  await expect(filtros.getByRole('textbox', { name: 'Hasta' })).toBeVisible();
});
