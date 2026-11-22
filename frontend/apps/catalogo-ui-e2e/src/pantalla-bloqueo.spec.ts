import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

// UI-14 y SEG-12: la pantalla de bloqueo se ve en el catalogo antes de usarse en el POS. Tapa toda
// la ventana, es un dialogo con nombre, su PIN se llama por su etiqueta y no tiene violaciones
// serias de axe en ningun tema.

async function mostrarBloqueo(page: Page, tema: 'claro' | 'oscuro', ancho: number): Promise<void> {
  await page.setViewportSize({ width: ancho, height: 800 });
  await page.goto(`/overlays?tema=${tema}`);
  await page.waitForLoadState('networkidle');
  // El modal y el drawer de la pagina arrancan abiertos: se cierran antes (el modal con Escape,
  // el drawer con su boton, porque el foco no queda en el).
  await expect(page.getByText('Editar producto').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.ui-drawer__cerrar').click();
  await page.getByRole('button', { name: 'Mostrar pantalla de bloqueo' }).click();
}

for (const tema of ['claro', 'oscuro'] as const) {
  for (const ancho of [375, 1280]) {
    test(`ui-pantalla-bloqueo en tema ${tema} a ${ancho} px: tapa la ventana, tiene nombre y pasa axe`, async ({ page }) => {
      await mostrarBloqueo(page, tema, ancho);

      const dialogo = page.getByRole('dialog', { name: 'Sesión bloqueada' });
      await expect(dialogo).toBeVisible();
      const caja = await page.locator('.ui-pantalla-bloqueo').boundingBox();
      expect(caja).toEqual({ x: 0, y: 0, width: ancho, height: 800 });
      await expect(dialogo.getByRole('textbox', { name: 'PIN de caja' })).toBeVisible();

      const tarjeta = await page.locator('.ui-pantalla-bloqueo__tarjeta').boundingBox();
      expect((tarjeta?.x ?? -1) >= 0 && (tarjeta?.x ?? 0) + (tarjeta?.width ?? 0) <= ancho).toBe(true);

      // Solo la pieza: lo de atras (el boton que la abrio, aun con el foco) queda tapado, y en el POS
      // es inerte.
      const resultado = await new AxeBuilder({ page }).include('.ui-pantalla-bloqueo').withTags(['wcag2a', 'wcag2aa']).analyze();
      const serias = resultado.violations.filter((violacion) => violacion.impact === 'serious' || violacion.impact === 'critical');
      expect(serias.map((violacion) => ({ id: violacion.id, nodos: violacion.nodes.map((nodo) => nodo.target) }))).toEqual([]);
    });
  }
}

test('ui-pantalla-bloqueo se cierra desde su contenido', async ({ page }) => {
  await mostrarBloqueo(page, 'claro', 1280);

  await page.getByRole('button', { name: 'Desbloquear' }).click();

  await expect(page.getByRole('dialog', { name: 'Sesión bloqueada' })).toHaveCount(0);
});
