<?php

declare(strict_types=1);

use App\Aplicacion\Cotizaciones\ConvertirCotizacion;
use App\Aplicacion\Cotizaciones\CrearCotizacion;
use App\Aplicacion\Produccion\CambiarEstadoOrden;
use App\Aplicacion\Produccion\CompletarOrden;
use App\Aplicacion\Produccion\RegistrarEntradaInsumo;
use App\Aplicacion\Produccion\RegistrarTransformacion;
use App\Modules\Cotizaciones\Dtos\ConvertirCotizacionDto;
use App\Modules\Cotizaciones\Dtos\CrearCotizacionDto;
use App\Modules\Cotizaciones\Dtos\LineaCotizacionDto;
use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Produccion\Dtos\CambiarEstadoOrdenDto;
use App\Modules\Produccion\Dtos\CrearTransformacionDto;
use App\Modules\Produccion\Dtos\InsumoStockDto;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

$op = $argv[1];
$observados = [];
DB::listen(static function (QueryExecuted $consulta) use (&$observados, $emitir): void {
    if (preg_match('/^select\b.*?\bfrom\s+[\x60"]?([a-z_]+)/i', $consulta->sql, $m) && in_array($m[1], ['cotizaciones', 'ordenes_produccion', 'insumo_stocks', 'inventario_stock', 'insumos', 'tenants'], true) && ! isset($observados[$m[1]])) {
        $observados[$m[1]] = true;
        $emitir(['bloqueo' => $m[1], 'for_update' => str_contains(strtolower($consulta->sql), 'for update'), 'transaccion' => $consulta->connection->transactionLevel()]);
    }
});
try {
    match ($op) {
        'cotizacion_convertir' => app(ConvertirCotizacion::class)->ejecutar(new ConvertirCotizacionDto($datos['metodo']), $datos['cotizacion'], $usuario),
        'cotizacion_crear' => app(CrearCotizacion::class)->ejecutar(new CrearCotizacionDto($datos['cliente'], $datos['sucursal'], 15, 0, null, null, [new LineaCotizacionDto($datos['variante'], 1, 100, 0)]), $usuario),
        'produccion_completar' => app(CambiarEstadoOrden::class)->ejecutar(new CambiarEstadoOrdenDto('completada', 1), $datos['orden']),
        'produccion_insumos' => app(CompletarOrden::class)->ejecutar($datos['orden'], 1),
        'transformar' => app(RegistrarTransformacion::class)->ejecutar(new CrearTransformacionDto($datos['variante'], $datos['destino'], 8, 4, null), $usuario),
        'insumo_entrada' => app(RegistrarEntradaInsumo::class)->ejecutar(new InsumoStockDto($datos['sucursal'], 2, 'L-04e', null), $datos['insumo']),
    };
    $emitir(['resultado' => $op]);
} catch (ExcepcionNegocio $error) {
    $emitir(['resultado' => $error->errorCode()]);
} catch (Throwable $error) {
    fwrite(STDERR, $error::class.': '.$error->getMessage());
    exit(1);
}
