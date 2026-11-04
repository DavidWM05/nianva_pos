import { expect, test } from '@playwright/test';

const rutas = ['tokens', 'format', 'feedback', 'actions', 'layout', 'data', 'forms', 'overlays', 'report'];
const temas = ['claro', 'oscuro'] as const;
const anchos = [375, 768, 1280] as const;

// Solo para la captura:
// - en ui-shell se desplaza <main>, no la pagina: sin esto, fullPage solo captura la ventana
//   (900 px) y casi nada de cada ruta entra en la regresion;
// - el aviso "Invalid PrimeUI License" (PrimeNG 22 sin clave de licencia, pendiente en
//   CONTEXTO_MIGRACION) es fijo y tapaba contenido; no debe quedar en la referencia.
const ESTILO_DE_CAPTURA = `
  ui-shell, .ui-shell, .ui-shell__menu { height: auto !important; }
  .ui-shell__contenido { overflow: visible !important; }
  #p-license-host { display: none !important; }
`;

for (const ruta of rutas) {
  for (const tema of temas) {
    for (const ancho of anchos) {
      test(`captura ${ruta} ${tema} ${ancho}`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 900 });
        await page.goto(`/${ruta}?tema=${tema}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('cat-root')).toBeVisible();
        await page.addStyleTag({ content: ESTILO_DE_CAPTURA });

        await expect(page).toHaveScreenshot(`catalogo-${ruta}-${tema}-${ancho}.png`, {
          fullPage: true,
        });
      });
    }
  }
}
