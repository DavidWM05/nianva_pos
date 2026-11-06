<?php

declare(strict_types=1);

use App\Aplicacion\Ventas\RegistrarVenta;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (DB::connection()->getDriverName() !== 'mysql') {
    throw new RuntimeException('Las operaciones de concurrencia requieren MySQL real.');
}

$datos = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
$emitir = static function (array $evento): void {
    $archivo = getenv('NIANVA_CONCURRENCIA_EVENTOS');
    if ($archivo === false || file_put_contents($archivo, json_encode($evento, JSON_THROW_ON_ERROR).PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
        throw new RuntimeException('No se pudo publicar el evento del proceso hijo.');
    }
};

// Se observa el SQL ejecutado, sin sustituir ni simular las consultas de producción.
DB::listen(static function (QueryExecuted $evento) use ($emitir): void {
    if (preg_match('/^select\b.*\binventario_stock\b/i', $evento->sql)) {
        $emitir([
            'lectura_stock' => true,
            'for_update' => str_contains(strtolower($evento->sql), 'for update'),
            'transaccion' => $evento->connection->transactionLevel(),
        ]);
    }
});

app(TenantContext::class)->set(Tenant::findOrFail($datos['tenant']));
$usuario = Usuario::findOrFail($datos['usuario']);
$emitir(['conexion' => (int) DB::selectOne('SELECT CONNECTION_ID() AS id')->id]);

if (in_array($argv[1] ?? '', ['apartado_crear', 'apartado_abonar', 'apartado_liquidar', 'apartado_cancelar', 'gasto', 'reembolso'], true)) {
    require __DIR__.'/operaciones04c.php';
    exit;
}

if (($argv[1] ?? '') !== 'venta') {
    require __DIR__.'/operaciones04b.php';
    exit;
}

try {
    $venta = app(RegistrarVenta::class)->ejecutar(new CrearVentaDto(
        clienteId: $datos['cliente'],
        items: [new LineaVentaDto($datos['variante'], 1)],
        pagos: [new PagoDto($datos['metodo'], 100.0)],
        cuponCodigo: null,
        descuentoManual: 0.0,
        giftCardCodigo: null,
        notaCreditoId: null,
    ), $usuario);
    $emitir(['resultado' => 'venta', 'venta_id' => $venta->id]);
} catch (StockInsuficienteException $excepcion) {
    $emitir(['resultado' => $excepcion->errorCode()]);
}
