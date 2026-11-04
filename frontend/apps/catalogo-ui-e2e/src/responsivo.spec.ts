import { expect, test } from '@playwright/test';

const rutas = ['tokens', 'format', 'feedback', 'actions', 'layout', 'data', 'forms', 'overlays', 'report'];
const anchos = [375, 768, 1280] as const;

for (const ruta of rutas) {
  for (const ancho of anchos) {
    test(`sin desborde ${ruta} ${ancho}`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto(`/${ruta}?tema=claro`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('cat-root')).toBeVisible();

      const medidas = await page.evaluate(() => {
        const main = document.querySelector('main');

        return {
          scrollWidth: Math.max(document.documentElement.scrollWidth, main?.scrollWidth ?? 0),
          innerWidth: window.innerWidth,
          mainScrollWidth: main?.scrollWidth ?? 0,
          mainClientWidth: main?.clientWidth ?? 0,
        };
      });

      expect(
        medidas.scrollWidth,
        `${ruta} a ${ancho}px: ${medidas.scrollWidth}px > ${medidas.innerWidth}px`,
      ).toBeLessThanOrEqual(medidas.innerWidth);
      // Desde md el menu lateral ocupa parte de la ventana: <main> es mas angosto que ella y
      // puede desbordarse por dentro sin que la pagina lo haga. Se compara contra su propio ancho.
      expect(
        medidas.mainScrollWidth,
        `${ruta} a ${ancho}px: main ${medidas.mainScrollWidth}px > ${medidas.mainClientWidth}px`,
      ).toBeLessThanOrEqual(medidas.mainClientWidth);
    });
  }
}
