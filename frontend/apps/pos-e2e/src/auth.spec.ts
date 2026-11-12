import { expect, test, type Page } from '@playwright/test';

import { codigoTotp, crearUsuarioComo, secretoDosFactor, tokenDeRestablecimiento } from './soporte/backend';
import { sinErrores, sinViolacionesSerias, vigilarErrores } from './soporte/humo';
import { PASSWORD } from './soporte/sesion';

// 50j: pantallas de auth (login, 2FA y recuperacion de contrasena). Estos flujos pasan antes de
// migrar y despues. El codigo TOTP se escribe con el teclado sobre el primer campo, asi vale
// igual para un campo por digito y para uno solo.

const ADMIN = 'admin@abarrotes.test';
const VENDEDOR = 'vendedor@abarrotes.test';
// Las pantallas de auth preguntan por la sesion al abrir; sin sesion, el 401 es la respuesta.
const SIN_SESION = ['GET /api/v1/sesion -> 401'];

async function enviarCredenciales(page: Page, correo: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.locator('#correo').fill(correo);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
}

async function escribirCodigo(page: Page, codigo: string): Promise<void> {
  await page.locator('form input').first().click();
  await page.keyboard.type(codigo);
}

async function dentroDeLaApp(page: Page): Promise<void> {
  await expect(page.locator('nucleo-pos-layout')).toBeVisible({ timeout: 20000 });
  await expect(page).not.toHaveURL(/\/(login|two-factor)/);
}

test('login: credenciales erroneas muestran el error y las correctas entran', async ({ page }) => {
  const errores = vigilarErrores(page);

  await enviarCredenciales(page, VENDEDOR, 'no-es-la-contrasena');
  await expect(page.getByText('Las credenciales no son validas.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await dentroDeLaApp(page);

  sinErrores(errores, '/login', SIN_SESION);
});

test('login con 2FA: un codigo erroneo se rechaza y el de la app de autenticacion entra', async ({ page }) => {
  const errores = vigilarErrores(page);

  await enviarCredenciales(page, ADMIN);
  await expect(page).toHaveURL(/\/two-factor\/verify/);
  await expect(page.getByRole('heading', { name: 'Verificación en dos pasos' })).toBeVisible();

  const verificar = page.getByRole('button', { name: 'Verificar' });
  await expect(verificar).toBeDisabled();
  await escribirCodigo(page, '000000');
  await verificar.click();
  await expect(page.getByText('Código inválido.')).toBeVisible();
  await expect(page).toHaveURL(/\/two-factor\/verify/);

  await escribirCodigo(page, codigoTotp(secretoDosFactor(ADMIN)));
  await verificar.click();
  await dentroDeLaApp(page);

  sinErrores(errores, '/two-factor/verify', SIN_SESION);
});

test('2FA inicial: un admin sin 2FA lo configura con el QR y recibe sus codigos de recuperacion', async ({ page }) => {
  const correo = 'admin-sin-2fa@abarrotes.test';
  crearUsuarioComo(ADMIN, correo);
  const errores = vigilarErrores(page);

  await enviarCredenciales(page, correo);
  await expect(page).toHaveURL(/\/two-factor\/setup/);
  await expect(page.getByRole('img', { name: 'Código QR para configurar 2FA' })).toBeVisible();

  const confirmar = page.getByRole('button', { name: 'Confirmar' });
  await expect(confirmar).toBeDisabled();
  const secreto = (await page.locator('.two-factor-setup__secret code').textContent())?.trim() ?? '';
  expect(secreto).toMatch(/^[A-Z2-7]{16,}$/);

  await escribirCodigo(page, codigoTotp(secreto));
  await confirmar.click();

  await expect(page.getByRole('heading', { name: 'Guarda tus códigos de recuperación' })).toBeVisible();
  await expect(page.locator('.recovery-codes li')).toHaveCount(8);
  await page.getByRole('button', { name: 'Ya los guardé, continuar' }).click();
  await dentroDeLaApp(page);

  sinErrores(errores, '/two-factor/setup', SIN_SESION);
});

test('recuperacion: pide el enlace, restablece la contrasena y entra con la nueva', async ({ page }) => {
  const correo = 'recupera@abarrotes.test';
  const nueva = 'nueva-contrasena-e2e';
  crearUsuarioComo(VENDEDOR, correo);
  const errores = vigilarErrores(page);

  await page.goto('/login');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await page.locator('#correo').fill(correo);
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  // El primer correo con el backend recien levantado tarda segundos (compila sus vistas).
  await expect(page.locator('.auth-card__status')).toBeVisible({ timeout: 20000 });

  // El correo lleva este mismo enlace (ResetPasswordNotification): token y correo en la URL.
  const token = tokenDeRestablecimiento(correo);
  await page.goto(`/reset-password?token=${token}&correo=${encodeURIComponent(correo)}`);
  await page.locator('#password').fill(nueva);
  await page.locator('#password_confirmation').fill('otra-distinta-123');
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();

  await page.locator('#password_confirmation').fill(nueva);
  await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
  await expect(page).toHaveURL(/\/login/);

  await enviarCredenciales(page, correo, nueva);
  await dentroDeLaApp(page);

  sinErrores(errores, '/reset-password', SIN_SESION);
});

/** axe a 1280 y a 390 px; deja la ventana en 1280. */
async function axeEnDosAnchos(page: Page): Promise<void> {
  for (const ancho of [1280, 390]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    await sinViolacionesSerias(page);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

for (const tema of ['claro', 'oscuro'] as const) {
  test(`axe en tema ${tema}, a 1280 y 390 px: login, recuperacion y 2FA, con sus errores`, async ({ page }) => {
    // Cinco pantallas, cada una en dos estados y dos anchos.
    test.setTimeout(150000);
    // Sin sesion no hay interruptor de tema: se guarda la preferencia como lo hace TemaService.
    await page.addInitScript((valor) => localStorage.setItem('nv-tema', valor), tema);
    const errores = vigilarErrores(page);

    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.classList.contains('nv-tema-oscuro'))).toBe(tema === 'oscuro');
    await axeEnDosAnchos(page);
    await enviarCredenciales(page, VENDEDOR, 'no-es-la-contrasena');
    await expect(page.getByText('Las credenciales no son validas.')).toBeVisible();
    await axeEnDosAnchos(page);

    await page.goto('/forgot-password');
    await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeVisible();
    await axeEnDosAnchos(page);
    await page.locator('#correo').fill(`nadie-${tema}@abarrotes.test`);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.locator('.auth-card__status')).toBeVisible({ timeout: 20000 });
    await axeEnDosAnchos(page);

    await page.goto('/reset-password?token=no-vale&correo=nadie%40abarrotes.test');
    await page.locator('#password').fill('nueva-contrasena-e2e');
    await page.locator('#password_confirmation').fill('otra-distinta-123');
    await page.getByRole('button', { name: 'Restablecer contraseña' }).click();
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
    await axeEnDosAnchos(page);

    await enviarCredenciales(page, ADMIN);
    await expect(page).toHaveURL(/\/two-factor\/verify/);
    await axeEnDosAnchos(page);
    await escribirCodigo(page, '000000');
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page.getByText('Código inválido.')).toBeVisible();
    await axeEnDosAnchos(page);

    // El 2FA inicial con otro admin: un contexto nuevo no trae la sesion pendiente del anterior.
    const correo = `admin-axe-${tema}@abarrotes.test`;
    crearUsuarioComo(ADMIN, correo);
    await page.context().clearCookies();
    await enviarCredenciales(page, correo);
    await expect(page.getByRole('img', { name: 'Código QR para configurar 2FA' })).toBeVisible();
    await axeEnDosAnchos(page);
    const secreto = (await page.locator('.two-factor-setup__secret code').textContent())?.trim() ?? '';
    await escribirCodigo(page, codigoTotp(secreto));
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByRole('heading', { name: 'Guarda tus códigos de recuperación' })).toBeVisible();
    await axeEnDosAnchos(page);

    sinErrores(errores, '/login', SIN_SESION);
  });
}
