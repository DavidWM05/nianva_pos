import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * Fase 4, B1: un producto con nombre largo y precio de cinco cifras, con stock en la sucursal del
 * vendedor del escenario. Es el caso que aprieta el carrito a 375 px: el escenario solo trae
 * nombres cortos y precios de dos cifras. Corre contra la SQLite del e2e, nunca contra la base de
 * desarrollo. Repetible: si el producto ya existe, solo repone el stock.
 */
export function prepararProductoLargoB1(nombre: string, precio: string, stock: number): void {
  const backend = path.resolve(__dirname, '../../../../../backend');
  const codigo = [
    'require ' + JSON.stringify(path.join(backend, 'vendor/autoload.php')) + ';',
    '$app = require ' + JSON.stringify(path.join(backend, 'bootstrap/app.php')) + ';',
    String.raw`$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();`,
    String.raw`$vendedor = App\Modules\Nucleo\Models\Usuario::sinTenant()->where('correo', 'vendedor@abarrotes.test')->firstOrFail();`,
    String.raw`$producto = App\Modules\Inventario\Models\Producto::withoutGlobalScopes()->where('tenant_id', $vendedor->tenant_id)->where('nombre', ` +
      JSON.stringify(nombre) +
      ')->first()',
    String.raw`  ?? App\Modules\Inventario\Models\Producto::factory()->create(['tenant_id' => $vendedor->tenant_id, 'nombre' => ` +
      JSON.stringify(nombre) +
      `, 'precio_venta' => ` +
      JSON.stringify(precio) +
      `, 'precio_compra' => '100.00']);`,
    String.raw`$variante = App\Modules\Inventario\Models\ProductoVariante::withoutGlobalScopes()->where('producto_id', $producto->id)->first()`,
    String.raw`  ?? App\Modules\Inventario\Models\ProductoVariante::factory()->create(['producto_id' => $producto->id]);`,
    String.raw`App\Modules\Inventario\Models\InventarioStock::withoutGlobalScopes()->updateOrCreate(['sucursal_id' => $vendedor->sucursal_id, 'variante_id' => $variante->id], ['stock_actual' => ` +
      stock +
      `, 'stock_minimo' => 0]);`,
  ].join('\n');
  execFileSync('php', ['-r', codigo], {
    cwd: backend,
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_ENV: 'local',
      APP_KEY: 'base64:' + Buffer.alloc(32, 7).toString('base64'),
      DB_CONNECTION: 'sqlite',
      DB_DATABASE: path.join(backend, 'storage/framework/testing/pos-e2e.sqlite'),
      CACHE_STORE: 'array',
      QUEUE_CONNECTION: 'sync',
    },
  });
}
