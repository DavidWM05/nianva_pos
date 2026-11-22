import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// UI-12 y UI-14: los impresos se ven en el catalogo antes de usarse en el POS. Ticket de 58 y
// 80 mm y carta, iguales en los dos temas (no tienen tema), y un solo servicio que imprime en un
// iframe reutilizado.

const MM_A_PX = 96 / 25.4;
const formatos = [
  { clase: 'ticket-58', boton: 'Imprimir Ticket 58 mm', anchoMm: 48 },
  { clase: 'ticket-80', boton: 'Imprimir Ticket 80 mm', anchoMm: 72 },
  { clase: 'carta', boton: 'Imprimir Carta', anchoMm: null },
] as const;

test('cada ticket mide su ancho util en papel: 48 mm el de 58 y 72 mm el de 80', async ({ page }) => {
  await page.goto('/print?tema=claro');
  await page.waitForLoadState('networkidle');

  for (const formato of formatos.filter((f) => f.anchoMm !== null)) {
    const caja = await page.locator(`.ui-impreso--${formato.clase}`).boundingBox();
    expect(Math.abs((caja?.width ?? 0) - (formato.anchoMm ?? 0) * MM_A_PX), formato.clase).toBeLessThan(2);
  }
});

for (const tema of ['claro', 'oscuro'] as const) {
  for (const formato of formatos) {
    test(`regresion visual del impreso ${formato.clase} en tema ${tema}: la misma captura en los dos temas`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`/print?tema=${tema}`);
      await page.waitForLoadState('networkidle');

      // Sin tema: claro y oscuro comparan contra la misma referencia. Se recorta al interior entero
      // del impreso: el ancho en mm no cae en un pixel exacto y el pixel del borde se mezcla con el
      // fondo de la pagina, que si cambia con el tema.
      const impreso = page.locator(`.ui-impreso--${formato.clase}`);
      await impreso.scrollIntoViewIfNeeded();
      const caja = (await impreso.boundingBox())!;
      const x = Math.ceil(caja.x);
      const y = Math.ceil(caja.y);
      const recorte = { x, y, width: Math.floor(caja.x + caja.width) - x - 1, height: Math.floor(caja.y + caja.height) - y - 1 };
      await expect(page).toHaveScreenshot(`impreso-${formato.clase}.png`, { clip: recorte });
    });
  }
}

test('dos impresiones seguidas usan un solo iframe y la segunda reemplaza a la primera', async ({ page }) => {
  await page.goto('/print?tema=claro');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Imprimir Ticket 80 mm' }).click();
  await page.getByRole('button', { name: 'Imprimir Ticket 80 mm' }).click();
  await expect(page.locator('#ui-impresion')).toHaveCount(1);
  const marco = page.frameLocator('#ui-impresion');
  await expect(marco.locator('.ui-impreso--ticket-80')).toContainText('V-1-23');

  await page.getByRole('button', { name: 'Imprimir Carta' }).click();
  await expect(page.locator('#ui-impresion')).toHaveCount(1);
  await expect(marco.locator('.ui-impreso--carta')).toContainText('Sucursal Centro');
  await expect(marco.locator('.ui-impreso--ticket-80')).toHaveCount(0);
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`axe en /print en tema ${tema}`, async ({ page }) => {
    await page.goto(`/print?tema=${tema}`);
    await page.waitForLoadState('networkidle');

    const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serias = resultado.violations.filter((violacion) => violacion.impact === 'serious' || violacion.impact === 'critical');
    expect(serias.map((violacion) => ({ id: violacion.id, nodos: violacion.nodes.map((nodo) => nodo.target) }))).toEqual([]);
  });
}
