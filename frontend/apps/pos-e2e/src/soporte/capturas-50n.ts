import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * 50n-a: capturas y axe a 1280 y 390 px de cada estado de tpv y reportes. Solo corre si
 * POS_E2E_EVIDENCIAS apunta a una carpeta fuera del repo; sin ella (CI, corridas normales) el
 * flujo se prueba igual y no se guarda nada. Con evidencias, una violacion seria o critica de axe
 * marca el test (expect.soft), como en las capturas de los encargos anteriores.
 */
const destino = process.env['POS_E2E_EVIDENCIAS'];

export async function capturarPantalla50n(page: Page, vista: string): Promise<void> {
  if (!destino) {
    return;
  }

  await page.waitForLoadState('networkidle');
  // Auditar el estado estable de la vista, despues de los avisos transitorios.
  await expect(page.locator('ui-toast-content')).toHaveCount(0, { timeout: 6000 });
  mkdirSync(path.join(destino, 'capturas'), { recursive: true });
  mkdirSync(path.join(destino, 'axe'), { recursive: true });

  for (const ancho of [1280, 390]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    // El shell cambia de modo con el ancho (angosto bajo 768 px); medir antes daria el layout viejo.
    await expect(page.locator('.ui-shell--angosta')).toHaveCount(ancho < 768 ? 1 : 0);
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((a) => a.effect?.getComputedTiming().endTime === Infinity || a.playState === 'finished'),
    );
    const contenido = page.locator('main.ui-shell__contenido');
    await contenido.evaluate((el) => el.scrollTo(0, 0));
    // El desborde se mide antes de agrandar la ventana: es el que veria el usuario.
    const desborde = await contenido.evaluate((el) => ({
      horizontal: el.scrollWidth - el.clientWidth,
      vertical: el.scrollHeight - el.clientHeight,
    }));

    if ((await page.getByRole('dialog').count()) === 0) {
      const altura = await contenido.evaluate((el) => el.scrollHeight + 90);
      await page.setViewportSize({ width: ancho, height: Math.max(900, altura) });
    }
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((a) => a.effect?.getComputedTiming().endTime === Infinity || a.playState === 'finished'),
    );

    const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const informe = { vista, ancho, url: new URL(page.url()).pathname, desborde, violaciones: resultado.violations };
    writeFileSync(path.join(destino, 'axe', `${vista}-${ancho}.json`), JSON.stringify(informe, null, 2) + '\n');
    await test.info().attach(`axe-${vista}-${ancho}`, { body: JSON.stringify(informe), contentType: 'application/json' });
    await page.screenshot({ path: path.join(destino, 'capturas', `${vista}-${ancho}.png`), fullPage: true });
    console.log(
      'AXE50N ' +
        JSON.stringify({
          vista,
          ancho,
          desborde,
          violaciones: resultado.violations.map((v) => ({ id: v.id, impacto: v.impact, nodos: v.nodes.map((n) => n.target) })),
        }),
    );
    expect
      .soft(
        resultado.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
        `${vista} ${ancho}`,
      )
      .toEqual([]);
    // El margen de ui-shell no debe provocar scroll horizontal (el vertical es el largo del contenido).
    expect.soft(desborde.horizontal, `desborde horizontal ${vista} ${ancho}`).toBeLessThanOrEqual(0);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
}
