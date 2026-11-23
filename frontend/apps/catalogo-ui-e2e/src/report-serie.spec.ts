import { expect, test } from '@playwright/test';

for (const tema of ['claro', 'oscuro']) {
  for (const ancho of [390, 1280]) {
    test(`serie compartida y reporte vacío en ${tema} a ${ancho} px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/report/serie?tema=' + tema);

      const serie = page.getByRole('figure', { name: 'Ventas por día' });
      await expect(serie).toBeVisible();
      await expect(serie.getByRole('listitem')).toHaveCount(3);
      await expect(serie).toContainText('$1,250.50');
      await expect(page.getByText('No hay resultados para los filtros seleccionados.')).toBeVisible();
    });
  }
}
