import { expect, test } from '@playwright/test';

// 49d: en el navegador real, Escape con el foco dentro de ui-drawer no lo cerraba, un solo Escape
// cerraba a la vez el modal y el drawer de abajo, y el drawer no tenia rol ni nombre accesible.
// Los specs unitarios no lo veian porque no corren en un navegador real.
const drawer = '.mat-drawer';

async function cerrarTodo(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/overlays?tema=claro');
  await page.waitForLoadState('networkidle');
  await page.locator('.ui-modal__cerrar').click();
  await page.locator('.ui-drawer__cerrar').click();
  await expect(page.locator(drawer)).not.toHaveClass(/mat-drawer-opened/);
}

test('Escape con el foco dentro del drawer lo cierra y devuelve el foco al boton que lo abrio', async ({ page }) => {
  await cerrarTodo(page);
  const abrir = page.getByRole('button', { name: 'Drawer sm' });

  await abrir.click();
  await expect(page.locator(drawer)).toHaveClass(/mat-drawer-opened/);
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.mat-drawer'))).toBe(true);

  await page.keyboard.press('Escape');

  await expect(page.locator(drawer)).not.toHaveClass(/mat-drawer-opened/);
  await expect(abrir).toBeFocused();
});

test('con un modal abierto sobre el drawer, Escape cierra solo el modal', async ({ page }) => {
  await page.goto('/overlays?tema=claro');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.mat-mdc-dialog-container')).toHaveCount(1);

  await page.keyboard.press('Escape');

  await expect(page.locator('.mat-mdc-dialog-container')).toHaveCount(0);
  await expect(page.locator(drawer)).toHaveClass(/mat-drawer-opened/);
});

test('el drawer se anuncia como dialogo con su titulo', async ({ page }) => {
  await cerrarTodo(page);
  await page.getByRole('button', { name: 'Drawer sm' }).click();

  const panel = page.getByRole('dialog', { name: 'Detalle de venta' });

  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('aria-modal', 'true');
});
