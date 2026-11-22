import { type Locator, expect, test } from '@playwright/test';

// UI-14: las piezas que el TPV estrena en B1 (UI-04, UI-17) se ven en el catalogo antes de
// usarse en pantallas: la lista de atajos, las tarjetas del carrito y el contenedor tactil.

test('ui-atajos-teclado: lista con nombre, una tecla por kbd y varias teclas en el mismo atajo', async ({ page }) => {
  await page.goto('/actions?tema=claro');
  await page.waitForLoadState('networkidle');

  const lista = page.getByRole('list', { name: 'Atajos de teclado' });
  await expect(lista.getByRole('listitem')).toHaveCount(3);

  const cobrar = lista.getByRole('listitem').filter({ hasText: 'Cobrar' });
  await expect(cobrar.locator('kbd')).toHaveText(['F4', 'F9']);
});

test('uiTactil: botones y campo nativo miden al menos 44 px solo dentro del contenedor', async ({ page }) => {
  await page.goto('/layout?tema=claro');
  await page.waitForLoadState('networkidle');

  const alto = async (elemento: Locator) => (await elemento.boundingBox())?.height ?? 0;

  // La seccion Tactil repite los mismos controles: los ultimos de la pagina van dentro de uiTactil.
  const dentro = {
    boton: page.getByRole('button', { name: 'Cancelar' }).last(),
    icono: page.getByRole('button', { name: 'Eliminar' }).last(),
    campo: page.getByRole('textbox', { name: 'Campo nativo en modo táctil' }),
  };

  for (const [nombre, elemento] of Object.entries(dentro)) {
    expect(await alto(elemento), `${nombre} con uiTactil`).toBeGreaterThanOrEqual(44);
  }

  // Fuera del contenedor no cambia nada: la pieza es la que da el alto.
  expect(await alto(page.getByRole('textbox', { name: 'Campo nativo sin modo táctil' }))).toBeLessThan(44);
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`uiTarjetas a 375 px en tema ${tema}: con un nombre largo ninguna tarjeta sale de main`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(`/layout?tema=${tema}`);
    await page.waitForLoadState('networkidle');

    const tarjetas = page.getByRole('list', { name: 'Líneas de ejemplo' }).getByRole('listitem');
    await expect(tarjetas).toHaveCount(2);

    const medidas = await page.evaluate(() => {
      const main = document.querySelector('main')!.getBoundingClientRect();

      return [...document.querySelectorAll('.ui-tarjeta')].map((tarjeta) => {
        const caja = tarjeta.getBoundingClientRect();

        return { izquierda: caja.left, derecha: caja.right, mainIzquierda: main.left, mainDerecha: main.right };
      });
    });

    for (const medida of medidas) {
      expect(medida.izquierda).toBeGreaterThanOrEqual(medida.mainIzquierda);
      expect(medida.derecha).toBeLessThanOrEqual(medida.mainDerecha);
    }

    await expect(tarjetas.nth(1).getByRole('button', { name: /^Quitar Refrigerador/ })).toBeVisible();
  });
}
