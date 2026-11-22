import { expect, test, type Page } from '@playwright/test';

import { asegurarCajaAbierta } from '../soporte/api';
import { conPinDeCaja, crearUsuarioComo } from '../soporte/backend';
import { sinViolacionesSerias } from '../soporte/humo';
import { PASSWORD, iniciarSesion } from '../soporte/sesion';

// Fase 4, B2 (SEG-12): el cajero bloquea la terminal sin cerrar la sesion y la desbloquea con su
// PIN de caja. Bloqueada, la API responde 423 sesion_bloqueada y la pantalla de bloqueo tapa la
// app (inerte detras), tambien tras recargar. Al desbloquear, el foco vuelve a donde estaba.
// Corre contra el backend real con un usuario propio, con los roles del vendedor del escenario.
const VENDEDOR = 'vendedor@abarrotes.test';
const CAJERO = 'bloqueo@abarrotes.test';
const PIN = '2468';
const API = 'http://127.0.0.1:' + (process.env['POS_E2E_BACKEND_PORT'] ?? '8100') + '/api/v1';

const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Sesión bloqueada' });
const entradaPin = (page: Page) => dialogo(page).getByRole('textbox', { name: 'PIN de caja' });

async function bloquearDesdeElMenu(page: Page): Promise<void> {
  // El servidor de e2e atiende una peticion a la vez: se espera a que la pantalla termine de cargar
  // y a la respuesta del bloqueo antes de buscar la pantalla de bloqueo.
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /^Menú de usuario/ }).click();
  const respuesta = page.waitForResponse((r) => r.url().endsWith('/sesion/bloquear') && r.request().method() === 'POST');
  await page.getByRole('menuitem', { name: 'Bloquear sesión' }).click();
  expect((await respuesta).status()).toBe(204);
  await expect(dialogo(page)).toBeVisible();
}

/** Escribe el PIN con el teclado, lo envia con Enter y espera la respuesta del desbloqueo. */
async function escribirPin(page: Page, pin: string): Promise<number> {
  await entradaPin(page).focus();
  for (const digito of pin) {
    await page.keyboard.press(digito);
  }
  const respuesta = page.waitForResponse((r) => r.url().endsWith('/sesion/desbloquear'));
  await page.keyboard.press('Enter');

  return (await respuesta).status();
}

async function estadoDeLaApi(page: Page): Promise<number> {
  return page.evaluate(async (api) => (await fetch(`${api}/ventas`, { credentials: 'include', headers: { Accept: 'application/json' } })).status, API);
}

test.beforeAll(() => {
  crearUsuarioComo(VENDEDOR, CAJERO);
});

test('el cajero da de alta su PIN en Preferencias', async ({ page }) => {
  await iniciarSesion(page, CAJERO);
  await page.goto('/perfil/preferencias');

  const formulario = page.locator('nucleo-pin-caja-form');
  await formulario.getByLabel('Tu contraseña').fill(PASSWORD);
  await formulario.getByRole('textbox', { name: 'Nuevo PIN de caja' }).focus();
  for (const digito of '1593') {
    await page.keyboard.press(digito);
  }
  const guardado = page.waitForResponse((r) => r.url().endsWith('/sesion/pin'));
  await page.getByRole('button', { name: 'Guardar PIN' }).click();
  expect((await guardado).status()).toBe(204);

  await expect(page.getByText('Tu PIN de caja quedó guardado.')).toBeVisible();
});

test('bloquea desde su menú: la API responde 423, la app queda inerte, el PIN incorrecto no entra y al desbloquear vuelve el foco', async ({ page }) => {
  conPinDeCaja(CAJERO, PIN);
  await iniciarSesion(page, CAJERO);
  await asegurarCajaAbierta(page);
  await page.goto('/tpv/venta');
  // Como iniciarSesion: la primera carga de la venta pide varias cosas al servidor de e2e.
  await expect(page.getByRole('heading', { name: 'Nueva venta' })).toBeVisible({ timeout: 20000 });

  await bloquearDesdeElMenu(page);

  await expect(entradaPin(page)).toBeFocused();
  expect(await estadoDeLaApi(page)).toBe(423);
  // El foco no sale de la pantalla de bloqueo: lo de atras esta inerte.
  for (let tecla = 0; tecla < 8; tecla += 1) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('.ui-pantalla-bloqueo') !== null)).toBe(true);
  }

  await escribirPin(page, '1357');
  await expect(dialogo(page).getByRole('alert')).toHaveText('El PIN no es correcto.');
  await expect(entradaPin(page)).toBeFocused();

  await escribirPin(page, PIN);
  await expect(dialogo(page)).toHaveCount(0);
  expect(await estadoDeLaApi(page)).toBe(200);
  // El menu ya habia devuelto el foco a su boton antes de bloquear: ahi vuelve.
  await expect(page.getByRole('button', { name: /^Menú de usuario/ })).toBeFocused();
});

test('tras recargar con la sesión bloqueada vuelve a pedir el PIN y al desbloquear sigue en la misma pantalla', async ({ page }) => {
  conPinDeCaja(CAJERO, PIN);
  await iniciarSesion(page, CAJERO);
  await asegurarCajaAbierta(page);
  await page.goto('/tpv/venta');
  // Como iniciarSesion: la primera carga de la venta pide varias cosas al servidor de e2e.
  await expect(page.getByRole('heading', { name: 'Nueva venta' })).toBeVisible({ timeout: 20000 });
  await bloquearDesdeElMenu(page);

  await page.reload();

  await expect(dialogo(page)).toBeVisible();
  await expect(page).toHaveURL(/\/tpv\/venta$/);
  // Tras recargar no hay sesion cargada: al desbloquear se pide GET /sesion antes de soltar al guard.
  const sesion = page.waitForResponse((r) => r.url().endsWith('/api/v1/sesion') && r.status() === 200);
  expect(await escribirPin(page, PIN)).toBe(204);
  await sesion;
  await expect(dialogo(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Nueva venta' })).toBeVisible();
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`axe en tema ${tema}, a 1280 y 390 px: la pantalla de bloqueo con y sin error`, async ({ page }) => {
    conPinDeCaja(CAJERO, PIN);
    await page.addInitScript((valor) => localStorage.setItem('nv-tema', valor), tema);
    await iniciarSesion(page, CAJERO);
    await page.goto('/tpv/caja');
    await bloquearDesdeElMenu(page);

    for (const ancho of [1280, 390]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await sinViolacionesSerias(page);
    }
    await escribirPin(page, '1357');
    await expect(dialogo(page).getByRole('alert')).toHaveText('El PIN no es correcto.');
    await sinViolacionesSerias(page);

    await escribirPin(page, PIN);
    await expect(dialogo(page)).toHaveCount(0);
  });
}
