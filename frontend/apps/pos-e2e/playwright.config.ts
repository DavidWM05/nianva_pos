import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const frontendRoot = path.resolve(__dirname, '../..');
const backendRoot = path.resolve(frontendRoot, '../backend');
const sqlite = path.join(backendRoot, 'storage/framework/testing/pos-e2e.sqlite');

const backendPort = process.env['POS_E2E_BACKEND_PORT'] ?? '8100';
const frontendPort = process.env['POS_E2E_FRONTEND_PORT'] ?? '4301';
const backendUrl = 'http://127.0.0.1:' + backendPort;
const frontendUrl = 'http://127.0.0.1:' + frontendPort;

const backendEnv = {
  APP_ENV: 'local',
  APP_DEBUG: 'false',
  APP_KEY: `base64:${Buffer.alloc(32, 7).toString('base64')}`,
  APP_URL: backendUrl,
  FRONTEND_URL: frontendUrl,
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: sqlite,
  SESSION_DRIVER: 'database',
  SESSION_LIFETIME: '480',
  SESSION_SECURE_COOKIE: 'false',
  SESSION_DOMAIN: '127.0.0.1',
  SESSION_SAME_SITE: 'lax',
  SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:' + frontendPort + ',127.0.0.1:' + backendPort,
  CORS_ALLOWED_ORIGINS: frontendUrl,
  CACHE_STORE: 'array',
  QUEUE_CONNECTION: 'sync',
};

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  // Los flujos con varias auditorias axe requieren margen en hosts compartidos.
  timeout: 60000,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: path.join(frontendRoot, 'playwright-report'), open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node apps/pos-e2e/backend-server.mjs',
      cwd: frontendRoot,
      env: backendEnv,
      url: backendUrl + '/up',
      // Nunca se reutiliza, y usa 8100 en vez del 8000 de desarrollo: un backend ya levantado
      // tendria otra base y otra configuracion de Sanctum, y el e2e escribiria datos en ella.
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: 'node apps/pos-e2e/frontend-server.mjs',
      cwd: frontendRoot,
      url: frontendUrl,
      reuseExistingServer: !process.env['CI'],
      timeout: 120000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
