import { expect, test } from '@playwright/test';

import { abrirPantalla, sinViolacionesSerias } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

const VENDEDOR = 'vendedor@abarrotes.test';

test('B4b: alta, edición, elección persistente y borrado de una terminal', async ({ page }) => {
  test.setTimeout(120000);
  await iniciarSesion(page, VENDEDOR);
  await abrirPantalla(page, '/terminales');
  await page.getByRole('button', { name: 'Nueva terminal' }).click();
  await expect(page).toHaveURL(/\/terminales\/nuevo$/);

  const nombre = page.getByRole('textbox', { name: 'Nombre', exact: true });
  const guardar = page.getByRole('button', { name: 'Guardar terminal' });
  await nombre.fill('Terminal B4 caja');
  await guardar.click();
  await expect(page).toHaveURL(/\/terminales\/\d+$/);
  const ruta = new URL(page.url()).pathname;
  await expect(nombre).toHaveValue('Terminal B4 caja');
  await nombre.fill('Terminal B4 auxiliar');
  await guardar.click();
  await expect(page.getByRole('heading', { name: 'Terminales', exact: true })).toBeVisible();
  await expect(page.getByText('Terminal B4 auxiliar', { exact: true })).toBeVisible();

  await abrirPantalla(page, '/perfil/preferencias');
  await page.getByRole('combobox', { name: 'Elegir terminal' }).selectOption({ label: 'Terminal B4 auxiliar' });
  await page.getByRole('button', { name: 'Cambiar terminal' }).click();
  await expect(page.getByText('Terminal actual: Terminal B4 auxiliar')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Terminal actual: Terminal B4 auxiliar')).toBeVisible();

  await abrirPantalla(page, ruta);
  await page.getByRole('button', { name: 'Eliminar terminal' }).click();
  const confirmacion = page.getByRole('dialog', { name: 'Eliminar terminal' });
  await expect(confirmacion).toBeVisible();
  await confirmacion.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page).toHaveURL(/\/terminales$/);
  await expect(page.getByText('Terminal B4 auxiliar', { exact: true })).toHaveCount(0);
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`B4b: axe en Terminales en tema ${tema} a 1280 y 390 px`, async ({ page }) => {
    await page.addInitScript((valor) => localStorage.setItem('nv-tema', valor), tema);
    await iniciarSesion(page, VENDEDOR);
    await abrirPantalla(page, '/terminales');
    await expect(page.getByRole('heading', { name: 'Terminales', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva terminal' })).toBeVisible();
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await sinViolacionesSerias(page);
    }
  });
}
