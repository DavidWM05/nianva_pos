import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Datos de lectura y saldos iniciales, usando las factories en la SQLite exclusiva del e2e. */
export function prepararSaldos50h(lectura = false): {
  cobrar: number;
  pagar: number;
  nota: number;
  venta: number;
} {
  const backend = path.resolve(__dirname, '../../../../../backend');
  const codigo = String.raw`
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$usuario = App\Modules\Nucleo\Models\Usuario::withoutGlobalScopes()->where('correo', 'vendedor@abarrotes.test')->firstOrFail();
$t = $usuario->tenant_id;
$lectura = getenv('SALDOS_LECTURA_50H') === '1';
$cliente = App\Modules\Crm\Models\Cliente::factory()->create(['tenant_id' => $t, 'nombre' => $lectura ? 'Cliente saldos lectura 50h' : 'Cliente saldos E2E']);
$venta = App\Modules\Tpv\Models\Venta::factory()->create(['tenant_id' => $t, 'cliente_id' => $cliente->id, 'sucursal_id' => $usuario->sucursal_id, 'usuario_id' => $usuario->id, 'total' => 100]);
$cobrar = App\Modules\CuentasCobrar\Models\CuentaCobrar::factory()->create(['venta_id' => $venta->id, 'fecha_vencimiento' => '2020-01-01']);
$proveedor = App\Modules\Inventario\Models\Proveedor::factory()->create(['tenant_id' => $t, 'razon_social' => $lectura ? 'Proveedor saldos lectura 50h' : 'Proveedor saldos E2E']);
$compra = App\Modules\Inventario\Models\Compra::factory()->create(['tenant_id' => $t, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $usuario->sucursal_id, 'usuario_id' => $usuario->id, 'total' => 100]);
$pagar = App\Modules\CuentasPagar\Models\CuentaPagar::factory()->create(['compra_id' => $compra->id]);
$devolucion = App\Modules\Devoluciones\Models\Devolucion::factory()->create(['venta_id' => $venta->id, 'monto_devolucion' => 100]);
$nota = App\Modules\NotasCredito\Models\NotaCredito::factory()->create(['devolucion_id' => $devolucion->id]);
if ($lectura) {
    App\Modules\GiftCards\Models\GiftCard::factory()->create(['tenant_id' => $t, 'cliente_id' => $cliente->id]);
    $plan = App\Modules\VentasPlazos\Models\PlanPagoCliente::factory()->create(['tenant_id' => $t, 'cliente_id' => $cliente->id]);
    App\Modules\VentasPlazos\Models\PlanPagoClienteCuota::factory()->create(['plan_pago_cliente_id' => $plan->id]);
    App\Modules\Crm\Models\Cliente::factory()->create(['tenant_id' => $t, 'nombre' => 'Cliente sin notas lectura 50h']);
}
echo json_encode(['cobrar' => $cobrar->id, 'pagar' => $pagar->id, 'nota' => $nota->id, 'venta' => $venta->id]);
`;
  return JSON.parse(
    execFileSync('php', ['-r', codigo], {
      cwd: backend,
      encoding: 'utf8',
      env: {
        ...process.env,
        APP_ENV: 'local',
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: path.join(
          backend,
          'storage/framework/testing/pos-e2e.sqlite',
        ),
        CACHE_STORE: 'array',
        SALDOS_LECTURA_50H: lectura ? '1' : '0',
      },
    }),
  );
}
