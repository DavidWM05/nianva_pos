import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4300',
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node apps/catalogo-ui-e2e/server.mjs',
    cwd: path.resolve(__dirname, '../..'),
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: !process.env['CI'],
    timeout: 120000,
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      // Tolerancia absoluta, no proporcional: las capturas son de pagina completa (hasta ~3
      // millones de pixeles) y un 1% dejaba pasar un cambio del tamano de un boton. Cambiar el
      // color del texto de un solo badge da ~125 pixeles distintos. Las referencias salen del
      // mismo runner de Linux con el Chromium fijado, asi que solo cubre antialias.
      maxDiffPixels: 20,
    },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
