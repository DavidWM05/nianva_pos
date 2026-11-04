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

// En CI (Linux) la fuente de reserva es mas ancha que en Windows, y /data a 768 se desbordaba
// solo alli (main 582px > 568px). Con una fuente ancha forzada, el mismo caso se reproduce en
// cualquier plataforma: el contenido tiene que acomodarse sin depender de la fuente.
for (const ruta of rutas) {
  test(`sin desborde con fuente ancha ${ruta} 768`, async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto(`/${ruta}?tema=claro`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();
    await page.addStyleTag({ content: '* { font-family: Verdana, "DejaVu Sans", sans-serif !important; }' });

    const main = await page.evaluate(() => {
      const elemento = document.querySelector('main');

      return { scroll: elemento?.scrollWidth ?? 0, cliente: elemento?.clientWidth ?? 0 };
    });

    expect(main.scroll, `${ruta} a 768px con fuente ancha: main ${main.scroll}px > ${main.cliente}px`).toBeLessThanOrEqual(
      main.cliente,
    );
  });
}
