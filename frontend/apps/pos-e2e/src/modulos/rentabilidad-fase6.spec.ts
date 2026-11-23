import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { sinViolacionesSerias } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

test.beforeAll(() => {
  const backend = path.resolve(__dirname, '../../../../../backend');
  execFileSync('php', ['-r', String.raw`
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$tenant = App\Modules\Nucleo\Models\Tenant::factory()->create(['nombre' => 'Rentabilidad E2E']);
$sucursal = App\Modules\Nucleo\Models\Sucursal::factory()->create(['tenant_id' => $tenant->id]);
$crear = function (string $correo, array $permisos) use ($tenant, $sucursal) {
    $usuario = App\Modules\Nucleo\Models\Usuario::factory()->create([
        'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'correo' => $correo, 'password' => 'password-dev-123',
    ]);
    $rol = App\Modules\Nucleo\Models\Rol::create(['tenant_id' => $tenant->id, 'nombre' => $correo, 'es_sistema' => false]);
    $rol->permisos()->sync(App\Modules\Nucleo\Models\Permiso::whereIn('nombre', $permisos)->pluck('id'));
    $usuario->roles()->attach($rol->id);
};
$crear('costos-f6@e2e.test', ['reportes.ver', 'reportes.exportar', 'reportes.costos']);
$crear('lector-costos-f6@e2e.test', ['reportes.ver', 'reportes.exportar']);
$venta = App\Modules\Tpv\Models\Venta::factory()->create([
    'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'total' => '116.00', 'fecha' => now(),
]);
App\Modules\Tpv\Models\VentaDetalle::factory()->create([
    'venta_id' => $venta->id, 'subtotal' => '116.00', 'impuesto' => '16.00', 'costo_unitario' => '60.00',
]);
`], {
    cwd: backend,
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_ENV: 'local',
      DB_CONNECTION: 'sqlite',
      DB_DATABASE: path.join(backend, 'storage/framework/testing/pos-e2e.sqlite'),
      CACHE_STORE: 'array',
      HASH_DRIVER: 'bcrypt',
      BCRYPT_ROUNDS: '4',
    },
  });
});

test('comparte rentabilidad en Inicio, Ventas y CSV solo con reportes.costos', async ({ page, browser }) => {
  await iniciarSesion(page, 'costos-f6@e2e.test');
  await page.goto('/nucleo');
  await expect(page.getByRole('heading', { name: 'Rentabilidad del mes' })).toBeVisible();
  await expect(page.locator('nucleo-rentabilidad')).toContainText('$40.00');
  await page.goto('/reportes/ventas');
  await expect(page.getByRole('heading', { name: 'Rentabilidad del periodo' })).toBeVisible();
  await expect(page.locator('nucleo-rentabilidad')).toContainText('40%');
  const descarga = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const archivo = await descarga;
  expect(await readFile(await archivo.path(), 'utf8')).toContain('rentabilidad.utilidad_bruta,40.00');

  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const lector = await contexto.newPage();
    await iniciarSesion(lector, 'lector-costos-f6@e2e.test');
    await lector.goto('/nucleo');
    await expect(lector.getByRole('heading', { name: 'Resumen del día' })).toBeVisible();
    await expect(lector.locator('nucleo-rentabilidad')).toHaveCount(0);
    await lector.goto('/reportes/ventas');
    await expect(lector.getByRole('figure', { name: 'Ventas por día' })).toBeVisible();
    await expect(lector.locator('nucleo-rentabilidad')).toHaveCount(0);
    const descargaLector = lector.waitForEvent('download');
    await lector.getByRole('button', { name: 'Exportar' }).click();
    const archivoLector = await descargaLector;
    expect(await readFile(await archivoLector.path(), 'utf8')).not.toContain('rentabilidad.');
  } finally {
    await contexto.close();
  }
});

for (const tema of ['claro', 'oscuro'] as const) {
  test('axe de rentabilidad en tema ' + tema + ' a 1280 y 390 px', async ({ page }) => {
    await page.addInitScript((valor) => localStorage.setItem('nv-tema', valor), tema);
    await iniciarSesion(page, 'costos-f6@e2e.test');
    for (const [ruta, titulo] of [['/nucleo', 'Rentabilidad del mes'], ['/reportes/ventas', 'Rentabilidad del periodo']]) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await sinViolacionesSerias(page);
      }
    }
  });
}
