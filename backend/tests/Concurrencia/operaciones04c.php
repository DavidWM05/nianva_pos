<?php

declare(strict_types=1);

use App\Aplicacion\Apartados\CancelarApartado;
use App\Aplicacion\Apartados\CrearApartado;
use App\Aplicacion\Apartados\LiquidarApartado;
use App\Aplicacion\Apartados\RegistrarAbonoApartado;
use App\Aplicacion\Devoluciones\RegistrarDevolucion;
use App\Aplicacion\Gastos\RegistrarGasto;
use App\Modules\Apartados\Dtos\CancelarApartadoDto;
use App\Modules\Apartados\Dtos\CrearApartadoDto;
use App\Modules\Apartados\Dtos\LineaApartadoDto;
use App\Modules\Apartados\Dtos\LiquidarApartadoDto;
use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Devoluciones\Dtos\CrearDevolucionDto;
use App\Modules\Devoluciones\Dtos\ItemDevueltoDto;
use App\Modules\Devoluciones\Dtos\PagoDevolucionDto;
use App\Modules\Gastos\Dtos\CrearGastoDto;
use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

$op = $argv[1];
$apartado = isset($datos['apartado']) ? Apartado::findOrFail($datos['apartado']) : null;
$tabla = match ($op) {
    'apartado_crear' => 'inventario_stock',
    'apartado_abonar', 'apartado_liquidar', 'apartado_cancelar' => 'apartados',
    'gasto' => 'caja_sesiones',
    'reembolso' => 'ventas',
};
$observado = false;
DB::listen(static function (QueryExecuted $consulta) use ($tabla, &$observado, $emitir): void {
    if (! $observado && preg_match('/^select\b.*?\bfrom\s+[\x60"]?([a-z_]+)/i', $consulta->sql, $m) && $m[1] === $tabla) {
        $observado = true;
        $emitir(['bloqueo' => $tabla, 'for_update' => str_contains(strtolower($consulta->sql), 'for update'), 'transaccion' => $consulta->connection->transactionLevel()]);
    }
});

try {
    $resultado = match ($op) {
        'apartado_crear' => app(CrearApartado::class)->ejecutar(new CrearApartadoDto($datos['cliente'], [new LineaApartadoDto($datos['variante'], 1)], null, null), $usuario),
        'apartado_abonar' => app(RegistrarAbonoApartado::class)->ejecutar(new RegistrarAbonoApartadoDto(50, [new PagoApartadoDto($datos['metodo'], 50)], null), $apartado, $usuario),
        'apartado_liquidar' => app(LiquidarApartado::class)->ejecutar(new LiquidarApartadoDto, $apartado, $usuario),
        'apartado_cancelar' => app(CancelarApartado::class)->ejecutar(new CancelarApartadoDto('Concurrencia 04c'), $apartado, $usuario)->apartado,
        'gasto' => app(RegistrarGasto::class)->ejecutar(new CrearGastoDto('Concurrencia', 10), $usuario),
        'reembolso' => app(RegistrarDevolucion::class)->ejecutar(new CrearDevolucionDto($datos['venta'], 'devolucion', [new ItemDevueltoDto($datos['variante'], 1, false)], [], [new PagoDevolucionDto($datos['metodo'], 100)], null, 'efectivo'), $usuario)['devolucion'],
    };
    $emitir(['resultado' => $op, 'id' => $resultado->id]);
} catch (ExcepcionNegocio $error) {
    $emitir(['resultado' => $error->errorCode()]);
}
