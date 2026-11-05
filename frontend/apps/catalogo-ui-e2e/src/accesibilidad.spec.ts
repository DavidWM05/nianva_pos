import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const rutas = ['tokens', 'format', 'feedback', 'actions', 'layout', 'data', 'forms', 'overlays', 'report'];
const temas = ['claro', 'oscuro'] as const;

for (const ruta of rutas) {
  for (const tema of temas) {
    test(`axe ${ruta} ${tema}`, async ({ page }) => {
      await page.goto(`/${ruta}?tema=${tema}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('cat-root')).toBeVisible();

      const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const violaciones = resultado.violations.filter(
        (violacion) => violacion.impact === 'serious' || violacion.impact === 'critical',
      );

      expect(
        violaciones.map((violacion) => ({
          id: violacion.id,
          impacto: violacion.impact,
          selectores: violacion.nodes.map((nodo) => nodo.target),
        })),
      ).toEqual([]);
    });
  }
}

for (const ruta of ['actions', 'forms']) {
  test(`foco visible en ${ruta}`, async ({ page }) => {
    await page.goto(`/${ruta}?tema=claro`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();

    const sinIndicador: string[] = [];

    for (let indice = 0; indice < 30; indice += 1) {
      await page.keyboard.press('Tab');
      const elemento = await page.evaluate(() => {
        const activo = document.activeElement as HTMLElement | null;

        if (!activo || activo === document.body) {
          return null;
        }

        const estilo = getComputedStyle(activo);
        const descripcion = `${activo.tagName.toLowerCase()} ${activo.getAttribute('aria-label') ?? activo.textContent?.trim().slice(0, 30) ?? ''}`;

        return {
          descripcion,
          outlineStyle: estilo.outlineStyle,
          outlineWidth: estilo.outlineWidth,
          boxShadow: estilo.boxShadow,
        };
      });

      if (
        elemento
        && ! ((elemento.outlineStyle !== 'none' && elemento.outlineWidth !== '0px') || elemento.boxShadow !== 'none')
      ) {
        sinIndicador.push(elemento.descripcion);
      }
    }

    expect(sinIndicador).toEqual([]);
  });
}

function luminancia(rgb: string): number {
  const canales = rgb.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map((canal) => Number(canal) / 255) ?? [];
  const [r, g, b] = canales.map((canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(fondo: string, texto: string): number {
  const uno = luminancia(fondo);
  const dos = luminancia(texto);

  return (Math.max(uno, dos) + 0.05) / (Math.min(uno, dos) + 0.05);
}

test('el campo deshabilitado de /forms conserva contraste en ambos temas', async ({ page }) => {
  for (const tema of ['oscuro', 'claro'] as const) {
    await page.goto(`/forms?tema=${tema}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();

    const colores = await page.locator('.ui-input-dinero input:disabled').first().evaluate((elemento) => {
      const estilo = getComputedStyle(elemento);

      return {
        fondo: estilo.backgroundColor,
        texto: estilo.color,
      };
    });

    const ratio = contraste(colores.fondo, colores.texto);

    expect(ratio, `${tema}: ${colores.texto} sobre ${colores.fondo}`).toBeGreaterThanOrEqual(4.5);
  }
});

test('los botones de solo icono tienen aria-label', async ({ page }) => {
  for (const ruta of rutas) {
    await page.goto(`/${ruta}?tema=claro`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('cat-root')).toBeVisible();

    const sinEtiqueta = await page.locator('button').evaluateAll((botones) =>
      botones
        .filter((boton) => ! (boton.textContent ?? '').trim() && ! boton.getAttribute('aria-label'))
        .map((boton) => boton.outerHTML.slice(0, 120)),
    );

    expect(sinEtiqueta, `Ruta ${ruta}`).toEqual([]);
  }
});
