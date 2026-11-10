import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

export async function capturarPantalla50e(
  page: Page,
  nombre: string,
): Promise<void> {
  await page.waitForLoadState('networkidle');
  if (nombre.endsWith('-auditoria')) {
    await expect(
      page.locator('nucleo-audit-log-viewer .badge').first(),
    ).toBeVisible();
  }
  for (const ancho of [1280, 390]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.waitForFunction(() =>
      document.getAnimations().every((animacion) => {
        const duracion = animacion.effect?.getComputedTiming().endTime;
        return duracion === Infinity || animacion.playState === 'finished';
      }),
    );
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const violaciones = resultado.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    const detalle = [];
    for (const violacion of violaciones) {
      const nodos = [];
      for (const nodo of violacion.nodes) {
        const selector = nodo.target[0];
        const enVisor =
          typeof selector === 'string'
            ? await page.evaluate((css) => {
                const elemento = document.querySelector(css);
                return elemento === null
                  ? null
                  : elemento.closest('nucleo-audit-log-viewer') !== null;
              }, selector)
            : null;
        nodos.push({
          selector: nodo.target,
          html: nodo.html,
          resumen: nodo.failureSummary,
          enVisor,
        });
      }
      detalle.push({ regla: violacion.id, impacto: violacion.impact, nodos });
    }
    const informe = { vista: nombre, ancho, violaciones: detalle };
    await test.info().attach('axe-' + nombre + '-' + ancho, {
      body: JSON.stringify(informe, null, 2),
      contentType: 'application/json',
    });
    console.log('AXE50E ' + JSON.stringify(informe));
    expect
      .soft(
        violaciones.map((v) => v.id),
        nombre + ' a ' + ancho + 'px',
      )
      .toEqual([]);
    if (process.env['CAPTURAS_50E'] === '1') {
      await page.screenshot({
        path: test.info().outputPath(nombre + '-' + ancho + '.png'),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
