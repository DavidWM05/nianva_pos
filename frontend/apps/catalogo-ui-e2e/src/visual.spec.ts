import { expect, test } from '@playwright/test';

const rutas = ['tokens', 'format', 'feedback', 'actions', 'layout', 'data', 'forms', 'overlays', 'report'];
const temas = ['claro', 'oscuro'] as const;
const anchos = [375, 768, 1280] as const;

for (const ruta of rutas) {
  for (const tema of temas) {
    for (const ancho of anchos) {
      test(`captura ${ruta} ${tema} ${ancho}`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 900 });
        await page.goto(`/${ruta}?tema=${tema}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('cat-root')).toBeVisible();

        await expect(page).toHaveScreenshot(`catalogo-${ruta}-${tema}-${ancho}.png`, {
          fullPage: true,
        });
      });
    }
  }
}
