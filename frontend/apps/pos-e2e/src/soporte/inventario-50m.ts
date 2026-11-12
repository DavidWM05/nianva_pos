import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Datos del estado de stock bajo, exclusivamente en la SQLite del e2e. */
export function prepararStockBajo50m(productoId: number): void {
  if (!Number.isInteger(productoId) || productoId <= 0)
    throw new Error('Producto inválido para el fixture');
  const backend = path.resolve(__dirname, '../../../../../backend');
  const codigo = [
    'require ' +
      JSON.stringify(path.join(backend, 'vendor/autoload.php')) +
      ';',
    '$app = require ' +
      JSON.stringify(path.join(backend, 'bootstrap/app.php')) +
      ';',
    String.raw`$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();`,
    String.raw`$producto = App\Modules\Inventario\Models\Producto::withoutGlobalScopes()->findOrFail(` +
      productoId +
      ');',
    '$variante = $producto->variantes()->orderBy("id")->firstOrFail();',
    String.raw`App\Modules\Inventario\Models\InventarioStock::withoutGlobalScopes()->where('variante_id', $variante->id)->update(['stock_minimo' => 5]);`,
    String.raw`$sucursal = App\Modules\Nucleo\Models\Sucursal::factory()->create(['tenant_id' => $producto->tenant_id, 'nombre' => 'Norte 50m']);`,
    String.raw`App\Modules\Inventario\Models\InventarioStock::factory()->create(['sucursal_id' => $sucursal->id, 'variante_id' => $variante->id, 'stock_actual' => 0, 'stock_minimo' => 2]);`,
  ].join('\n');
  execFileSync('php', ['-r', codigo], {
    cwd: backend,
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_ENV: 'local',
      APP_KEY: 'base64:' + Buffer.alloc(32, 7).toString('base64'),
      DB_CONNECTION: 'sqlite',
      DB_DATABASE: path.join(
        backend,
        'storage/framework/testing/pos-e2e.sqlite',
      ),
      CACHE_STORE: 'array',
      QUEUE_CONNECTION: 'sync',
    },
  });
}
