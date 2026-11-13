import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const destino = path.resolve(
  __dirname,
  '../../../../../../tmp-codex/50l/final',
);
export async function capturarPantalla50l(
  page: Page,
  vista: string,
): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Auditar el estado estable de la vista, despues de los avisos transitorios.
  await expect(page.locator('ui-toast-content')).toHaveCount(0, {
    timeout: 6000,
  });
  mkdirSync(path.join(destino, 'capturas'), { recursive: true });
  mkdirSync(path.join(destino, 'axe'), { recursive: true });
  for (const ancho of [1280, 390]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page
      .locator('main.ui-shell__contenido')
      .evaluate((el) => el.scrollTo(0, 0));
    if ((await page.getByRole('dialog').count()) === 0) {
      const altura = await page
        .locator('main.ui-shell__contenido')
        .evaluate((el) => el.scrollHeight + 90);
      await page.setViewportSize({
        width: ancho,
        height: Math.max(900, altura),
      });
    }
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every(
          (a) =>
            a.effect?.getComputedTiming().endTime === Infinity ||
            a.playState === 'finished',
        ),
    );
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const informe = {
      vista,
      ancho,
      url: new URL(page.url()).pathname,
      violaciones: resultado.violations,
    };
    writeFileSync(
      path.join(destino, 'axe', vista + '-' + ancho + '.json'),
      JSON.stringify(informe, null, 2) + '\n',
    );
    await test.info().attach('axe-' + vista + '-' + ancho, {
      body: JSON.stringify(informe),
      contentType: 'application/json',
    });
    await page.screenshot({
      path: path.join(destino, 'capturas', vista + '-' + ancho + '.png'),
      fullPage: true,
    });
    console.log(
      'AXE50L ' +
        JSON.stringify({
          vista,
          ancho,
          violaciones: resultado.violations.map((v) => ({
            id: v.id,
            impacto: v.impact,
            nodos: v.nodes.map((n) => ({
              selector: n.target,
              resumen: n.failureSummary,
            })),
          })),
        }),
    );
    expect
      .soft(
        resultado.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        ),
        vista + ' ' + ancho,
      )
      .toEqual([]);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.bringToFront();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animacion) =>
          animacion.effect?.getComputedTiming().endTime === Infinity ||
          animacion.playState === 'finished',
      ),
  );
}
