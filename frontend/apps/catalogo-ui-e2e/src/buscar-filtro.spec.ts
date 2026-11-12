import { expect, test } from '@playwright/test';

// UI-11: la busqueda de los listados es un input nativo dentro de ui-campo, al lado de
// ui-select-filtro. Sin estilo propio media ~21 px, con el borde gris del navegador y sin el foco
// de los demas campos: la barra de filtros quedaba desalineada.
for (const tema of ['claro', 'oscuro'] as const) {
  test(`en /data la busqueda mide lo mismo que el selector y tiene la caja de los campos (${tema})`, async ({ page }) => {
    await page.goto(`/data?tema=${tema}`);
    await page.waitForLoadState('networkidle');

    const barra = page.locator('ui-filter-bar').filter({ has: page.locator('input[type="search"]') });
    const buscar = barra.getByRole('searchbox', { name: 'Buscar' });
    const selector = barra.locator('ui-select-filtro');

    await expect(buscar).toBeVisible();
    const altoBuscar = (await buscar.boundingBox())?.height ?? 0;
    const altoSelector = (await selector.boundingBox())?.height ?? 0;
    expect(Math.abs(altoBuscar - altoSelector), `busqueda ${altoBuscar} px, selector ${altoSelector} px`).toBeLessThanOrEqual(2);

    // Los colores esperados salen de los tokens del tema activo, resueltos en un elemento de prueba.
    const token = (nombre: string, propiedad: 'color' | 'backgroundColor') =>
      page.evaluate(
        ([variable, prop]) => {
          const prueba = document.createElement('span');
          prueba.style[prop as 'color'] = `var(${variable})`;
          document.body.append(prueba);
          const valor = getComputedStyle(prueba)[prop as 'color'];
          prueba.remove();

          return valor;
        },
        [nombre, propiedad],
      );
    const estilo = () =>
      buscar.evaluate((input) => {
        const css = getComputedStyle(input);

        return {
          ancho: css.borderTopWidth,
          tipo: css.borderTopStyle,
          borde: css.borderTopColor,
          fondo: css.backgroundColor,
          texto: css.color,
          contorno: css.outlineColor,
          contornoTipo: css.outlineStyle,
        };
      });

    const reposo = await estilo();
    expect(reposo.ancho).toBe('1px');
    expect(reposo.tipo).toBe('solid');
    expect(reposo.borde).toBe(await token('--nv-borde', 'color'));
    expect(reposo.fondo).toBe(await token('--nv-superficie', 'backgroundColor'));
    expect(reposo.texto).toBe(await token('--nv-texto', 'color'));
    expect(reposo.borde, 'el borde se distingue del fondo').not.toBe(reposo.fondo);

    await buscar.focus();
    const foco = await estilo();
    expect(foco.contornoTipo).toBe('solid');
    expect(foco.contorno).toBe(await token('--nv-foco', 'color'));
  });
}
