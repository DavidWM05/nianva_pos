import { expect, test } from '@playwright/test';

import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

// 50i: Preferencias y el demo de vista de registro, antes y despues de migrarlos a libs/ui.

test('preferencias: muestra mis dispositivos y el formulario de cambiar contraseña', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/perfil/preferencias');

  await expect(page.getByRole('heading', { name: 'Preferencias', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mis dispositivos' })).toBeVisible();
  await expect(page.getByText(/No tienes dispositivos confiados|IP de registro/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cambiar contraseña' })).toBeVisible();
  await expect(page.getByLabel('Contraseña actual')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cambiar contraseña' })).toBeVisible();

  sinErrores(errores, '/perfil/preferencias');
});

test('preferencias: con contraseñas distintas no se envia y avisa', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/perfil/preferencias');

  await page.getByLabel('Contraseña actual').fill('password-dev-123');
  await page.getByRole('textbox', { name: 'Nueva contraseña', exact: true }).fill('nueva-password-456');
  await page.getByLabel('Confirmar nueva contraseña').fill('otra-distinta-789');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();

  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();

  sinErrores(errores, '/perfil/preferencias');
});

test('demo de vista de registro: pestañas y auditoria diferida', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/demo/vista-registro');

  await expect(page.getByText('Contenido de ejemplo para la pestaña "General".')).toBeVisible();
  await page.getByRole('tab', { name: 'Relacionado' }).click();
  await expect(page.getByText('Contenido de ejemplo para la pestaña "Relacionado".')).toBeVisible();
  await page.getByRole('tab', { name: 'Auditoría' }).click();
  await expect(page.getByText(/Sin actividad registrada|Sistema|antes/).first()).toBeVisible();

  sinErrores(errores, '/demo/vista-registro');
});
