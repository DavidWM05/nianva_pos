import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Datos aislados de reportes sobre la SQLite exclusiva de Playwright. */
export function prepararReportes(): void {
  const backend = path.resolve(__dirname, '../../../../../backend');
  execFileSync('php', ['-r', String.raw`
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (App\Modules\Nucleo\Models\Usuario::withoutGlobalScopes()->where('correo', 'gerente-reportes@e2e.test')->exists()) {
    return;
}
$tenant = App\Modules\Nucleo\Models\Tenant::factory()->create(['nombre' => 'Reportes E2E']);
$centro = App\Modules\Nucleo\Models\Sucursal::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Centro reportes']);
$norte = App\Modules\Nucleo\Models\Sucursal::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Norte reportes']);
$crearUsuario = function (string $correo, array $permisos) use ($tenant, $centro) {
    $usuario = App\Modules\Nucleo\Models\Usuario::factory()->create([
        'tenant_id' => $tenant->id, 'sucursal_id' => $centro->id, 'correo' => $correo, 'password' => 'password-dev-123',
    ]);
    $rol = App\Modules\Nucleo\Models\Rol::create(['tenant_id' => $tenant->id, 'nombre' => $correo, 'es_sistema' => false]);
    $rol->permisos()->sync(App\Modules\Nucleo\Models\Permiso::whereIn('nombre', $permisos)->pluck('id'));
    $usuario->roles()->attach($rol->id);
    return $usuario;
};
$gerente = $crearUsuario('gerente-reportes@e2e.test', ['reportes.ver', 'reportes.exportar', 'usuarios.ver', 'sucursales.todas']);
$crearUsuario('lector-reportes@e2e.test', ['reportes.ver']);
$crearUsuario('sin-reportes@e2e.test', []);
$cliente = App\Modules\Crm\Models\Cliente::factory()->create(['tenant_id' => $tenant->id]);
$base = ['tenant_id' => $tenant->id, 'usuario_id' => $gerente->id, 'cliente_id' => $cliente->id, 'total' => '12.50'];
foreach (range(1, 27) as $indice) {
    App\Modules\Tpv\Models\Venta::factory()->create([
        ...$base, 'sucursal_id' => $centro->id, 'fecha' => '2024-06-14 18:00:00', 'folio' => 'V-F6-'.$indice,
    ]);
}
App\Modules\Tpv\Models\Venta::factory()->create([
    ...$base, 'sucursal_id' => $centro->id, 'fecha' => '2024-06-13 18:00:00', 'folio' => 'V-F6-FUERA',
]);
App\Modules\Tpv\Models\Venta::factory()->create([
    ...$base, 'sucursal_id' => $norte->id, 'fecha' => '2024-06-14 18:00:00', 'folio' => 'V-F6-NORTE',
]);`], {
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
}
