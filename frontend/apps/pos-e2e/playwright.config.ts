import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const frontendRoot = path.resolve(__dirname, '../..');
const backendRoot = path.resolve(frontendRoot, '../backend');
const sqlite = path.join(backendRoot, 'storage/framework/testing/pos-e2e.sqlite');

const backendEnv = {
  APP_ENV: 'local',
  APP_DEBUG: 'false',
  APP_KEY: `base64:${Buffer.alloc(32, 7).toString('base64')}`,
  APP_URL: 'http://127.0.0.1:8100',
  FRONTEND_URL: 'http://127.0.0.1:4301',
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: sqlite,
  SESSION_DRIVER: 'database',
  SESSION_LIFETIME: '480',
  SESSION_SECURE_COOKIE: 'false',
  SESSION_DOMAIN: '127.0.0.1',
  SESSION_SAME_SITE: 'lax',
  SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:4301,127.0.0.1:8100',
  CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:4301',
  CACHE_STORE: 'array',
  QUEUE_CONNECTION: 'sync',
};

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4301',
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
      url: 'http://127.0.0.1:8100/up',
      // Nunca se reutiliza, y usa 8100 en vez del 8000 de desarrollo: un backend ya levantado
      // tendria otra base y otra configuracion de Sanctum, y el e2e escribiria datos en ella.
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: 'node apps/pos-e2e/frontend-server.mjs',
      cwd: frontendRoot,
      url: 'http://127.0.0.1:4301',
      reuseExistingServer: !process.env['CI'],
      timeout: 120000,
    },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
