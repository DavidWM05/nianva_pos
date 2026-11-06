import { execFileSync, spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../backend');
// Siempre su propia SQLite, nunca DB_DATABASE del entorno: este script corre migrate:fresh, y
// lanzado desde una terminal con la base de desarrollo configurada la borraria.
const sqlite = join(backendRoot, 'storage/framework/testing/pos-e2e.sqlite');

mkdirSync(dirname(sqlite), { recursive: true });
rmSync(sqlite, { force: true });
writeFileSync(sqlite, '');

const env = {
  ...process.env,
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: sqlite,
  SESSION_DRIVER: 'database',
  SESSION_LIFETIME: '480',
  SESSION_SECURE_COOKIE: 'false',
  SESSION_DOMAIN: '127.0.0.1',
  SESSION_SAME_SITE: 'lax',
  APP_ENV: 'local',
  APP_DEBUG: 'false',
  APP_KEY: process.env.APP_KEY ?? `base64:${Buffer.alloc(32, 7).toString('base64')}`,
  APP_URL: 'http://127.0.0.1:8100',
  FRONTEND_URL: 'http://127.0.0.1:4301',
  SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:4301,127.0.0.1:8100',
  CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:4301',
  CACHE_STORE: 'array',
  QUEUE_CONNECTION: 'sync',
};

function artisan(...argumentos) {
  execFileSync('php', ['artisan', ...argumentos, '--force'], {
    cwd: backendRoot,
    env,
    stdio: 'inherit',
  });
}

artisan('migrate:fresh');
artisan('db:seed', '--class=Database\\Seeders\\Escenarios\\EscenarioAbarrotesSeeder');

const permisos = `
$pdo = new PDO('sqlite:'.getenv('DB_DATABASE'));
$tenant = $pdo->query("select id from tenants where nombre = 'Abarrotes Escenario Granel'")->fetchColumn();
$rol = $pdo->query("select id from roles where tenant_id is null and nombre = 'vendedor'")->fetchColumn();
// Todos los permisos, solo en esta base de e2e: los e2e de pantallas (50a) recorren todo el
// menu. Se usa el vendedor y no el admin porque el admin exige 2FA; los permisos son la unica
// autoridad (SEG-03), asi que con ellos se llega a todas las pantallas.
$ids = $pdo->query("select id from permisos")->fetchAll(PDO::FETCH_COLUMN);
$stmt = $pdo->prepare('insert or ignore into rol_permisos (rol_id, permiso_id) values (?, ?)');
foreach ($ids as $id) {
    $stmt->execute([$rol, $id]);
}
`;

execFileSync('php', ['-r', permisos], {
  cwd: backendRoot,
  env,
  stdio: 'inherit',
});

const servidor = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8100', '--no-reload'], {
  cwd: backendRoot,
  env,
  stdio: 'inherit',
});

const detener = () => {
  servidor.kill();
};

process.on('SIGINT', detener);
process.on('SIGTERM', detener);
servidor.on('exit', (codigo) => process.exit(codigo ?? 0));
