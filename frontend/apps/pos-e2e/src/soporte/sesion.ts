import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'password-dev-123';

export async function iniciarSesion(page: Page, correo: string): Promise<void> {
  await page.goto('/login');
  await page.locator('#correo').fill(correo);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
  await expect(page.locator('nucleo-pos-layout')).toBeVisible({ timeout: 20000 });
}
