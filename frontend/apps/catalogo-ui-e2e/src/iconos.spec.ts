import { expect, test } from '@playwright/test';

test('el icono de navegación usa el tamaño base de los tokens', async ({ page }) => {
  await page.goto('/tokens');
  await page.waitForLoadState('networkidle');

  const navegacion = page.locator('cat-root nav .pi').first();

  await expect(navegacion).toHaveCSS('font-size', '14px');
});
