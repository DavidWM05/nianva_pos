import { expect, test, type Page } from '@playwright/test';

// 49d: con MatDialog el contenido del modal quedaba pegado al borde de la superficie y el boton
// Cerrar salia recortado en la esquina. Con MatDrawer, el velo del drawer salia gris claro en
// oscuro (neutral-variant20 apuntaba a texto-suave). Se vio en las capturas de Linux.
const MARGEN_MINIMO = 16;

async function abrirOverlays(page: Page, tema: 'claro' | 'oscuro'): Promise<void> {
  await page.goto(`/overlays?tema=${tema}`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.mat-mdc-dialog-surface')).toBeVisible();
}

for (const ancho of [1280, 375]) {
  test(`el contenido del modal guarda margen dentro de la superficie a ${ancho} px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await abrirOverlays(page, 'claro');

    const superficie = await page.locator('.mat-mdc-dialog-surface').boundingBox();
    const titulo = await page.locator('.ui-modal__titulo').boundingBox();
    const cerrar = await page.locator('.ui-modal__cerrar').boundingBox();
    expect(superficie && titulo && cerrar).toBeTruthy();
    if (!superficie || !titulo || !cerrar) {
      return;
    }

    expect(titulo.x - superficie.x, 'margen izquierdo del titulo').toBeGreaterThanOrEqual(MARGEN_MINIMO);
    expect(cerrar.y - superficie.y, 'margen superior del boton Cerrar').toBeGreaterThanOrEqual(MARGEN_MINIMO / 2);
    expect(superficie.x + superficie.width - (cerrar.x + cerrar.width), 'margen derecho del boton Cerrar').toBeGreaterThanOrEqual(
      MARGEN_MINIMO / 2,
    );
  });
}

function luminanciaDe(color: string): number {
  // Chromium da rgb()/rgba() o color(srgb r g b / a) segun como se calculo el color.
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(color);
  const rgb = /rgba?\((\d+), (\d+), (\d+)/.exec(color);
  const canales = srgb
    ? srgb.slice(1, 4).map(Number)
    : rgb
      ? rgb.slice(1, 4).map((valor) => Number(valor) / 255)
      : [];
  expect(canales, `color sin interpretar: ${color}`).toHaveLength(3);
  const [r, g, b] = canales.map((valor) => (valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4));

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

for (const tema of ['claro', 'oscuro'] as const) {
  test(`el velo del drawer oscurece la pagina en tema ${tema}`, async ({ page }) => {
    await abrirOverlays(page, tema);

    const velo = await page
      .locator('.ui-drawer__contenedor .mat-drawer-backdrop')
      .evaluate((elemento) => getComputedStyle(elemento).backgroundColor);

    expect(luminanciaDe(velo), `velo del drawer: ${velo}`).toBeLessThan(0.05);
  });
}
