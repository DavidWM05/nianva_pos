import { expect, test, type Page } from '@playwright/test';

import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from './soporte/humo';
import { iniciarSesion } from './soporte/sesion';

// 50i: el marco de la app autenticada (sidebar, breadcrumb y menu de usuario).

test('shell: el breadcrumb lleva de vuelta a Inicio y el menu se colapsa y se expande', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/perfil/preferencias');

  const breadcrumb = page.locator('nucleo-breadcrumb');
  await expect(breadcrumb.getByText('Preferencias')).toBeVisible();
  await breadcrumb.getByRole('link', { name: 'Inicio' }).click();
  await expect(page).not.toHaveURL(/perfil/);

  await page.getByRole('button', { name: 'Colapsar menu' }).click();
  await expect(page.getByRole('button', { name: 'Expandir menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Expandir menu' }).click();
  await expect(page.getByRole('button', { name: 'Colapsar menu' })).toBeVisible();

  sinErrores(errores, '/');
});

const CLASE_OSCURO = 'nv-tema-oscuro';
const enOscuro = (page: Page) => page.evaluate((clase) => document.documentElement.classList.contains(clase), CLASE_OSCURO);
const botonMenu = (page: Page) => page.getByRole('button', { name: /^Menú de usuario: Vendedor/ });

async function elegirTema(page: Page, etiqueta: 'Tema claro' | 'Tema oscuro' | 'Tema del sistema'): Promise<void> {
  await botonMenu(page).click();
  await page.getByRole('menuitemradio', { name: etiqueta }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
}

/** axe en el shell y en las pantallas de la 50i, con el tema que este puesto. */
async function axeEnPantallas50i(page: Page): Promise<void> {
  await abrirPantalla(page, '/perfil/preferencias');
  await sinViolacionesSerias(page);
  await botonMenu(page).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await sinViolacionesSerias(page);
  await page.keyboard.press('Escape');

  await abrirPantalla(page, '/demo/vista-registro');
  await sinViolacionesSerias(page);
  await page.getByRole('tab', { name: 'Relacionado' }).click();
  await sinViolacionesSerias(page);
  await page.getByRole('tab', { name: 'Auditoría' }).click();
  await expect(page.getByText(/Sin actividad registrada|Sistema|antes/).first()).toBeVisible();
  await sinViolacionesSerias(page);
}

test('menu de usuario: se maneja con teclado y la opcion de tema marcada se anuncia', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/perfil/preferencias');

  await botonMenu(page).focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('group', { name: 'Tema' })).toBeVisible();
  await expect(page.getByRole('menuitemradio', { name: 'Tema del sistema' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('menuitemradio', { name: 'Tema oscuro' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('menuitem', { name: 'Preferencias' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(botonMenu(page)).toBeFocused();

  sinErrores(errores, '/perfil/preferencias');
});

test('tema: el interruptor cambia el tema, se recuerda, y axe pasa en claro y en oscuro', async ({ page }) => {
  // Recorre dos veces el shell, Preferencias y las pestañas del demo con axe.
  test.setTimeout(120000);
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const errores = vigilarErrores(page);

  // Por defecto, claro (el cambio a 'sistema' es del 50n).
  await abrirPantalla(page, '/perfil/preferencias');
  expect(await enOscuro(page)).toBe(false);

  await elegirTema(page, 'Tema oscuro');
  expect(await enOscuro(page)).toBe(true);
  await page.reload();
  await expect(botonMenu(page)).toBeVisible();
  expect(await enOscuro(page)).toBe(true);
  await axeEnPantallas50i(page);

  await elegirTema(page, 'Tema claro');
  expect(await enOscuro(page)).toBe(false);
  await axeEnPantallas50i(page);

  sinErrores(errores, '/perfil/preferencias');
});

test('tema del sistema: sigue al sistema operativo en vivo', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  await abrirPantalla(page, '/perfil/preferencias');

  await elegirTema(page, 'Tema claro');
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await enOscuro(page)).toBe(false);
  await elegirTema(page, 'Tema del sistema');
  expect(await enOscuro(page)).toBe(true);

  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => enOscuro(page)).toBe(false);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => enOscuro(page)).toBe(true);

  await elegirTema(page, 'Tema claro');
  await page.emulateMedia({ colorScheme: 'light' });
});

test('menu de usuario: visible en pantalla angosta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  await abrirPantalla(page, '/perfil/preferencias');

  await expect(botonMenu(page)).toBeVisible();
  await botonMenu(page).click();
  await expect(page.getByRole('menuitemradio', { name: 'Tema oscuro' })).toBeVisible();
  await sinViolacionesSerias(page);
});

test('cerrar sesion: lleva a /login y una ruta protegida vuelve a /login', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  await abrirPantalla(page, '/perfil/preferencias');

  await botonMenu(page).click();
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/perfil/preferencias');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('nucleo-pos-layout')).toHaveCount(0);
});
