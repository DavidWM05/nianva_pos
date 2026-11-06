<?php

declare(strict_types=1);

use App\Aplicacion\Caja\AbrirCaja;
use App\Aplicacion\Caja\CerrarCaja;
use App\Aplicacion\Inventario\RegistrarCompra;
use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Aplicacion\Ventas\AnularVenta;
use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Tpv\Dtos\AbrirCajaDto;
use App\Modules\Tpv\Dtos\AnularVentaDto;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

$operacion = $argv[1];
// Los parámetros se leen antes de observar: el dato vigente lo relee la Action bajo bloqueo.
$caja = isset($datos['caja']) ? CajaSesion::findOrFail($datos['caja']) : null;
$venta = isset($datos['venta']) ? Venta::findOrFail($datos['venta']) : null;
$tabla = match ($operacion) {
    'abrir' => 'sucursales',
    'cerrar' => 'caja_sesiones',
    'anular' => 'ventas',
    'movimiento', 'compra' => 'inventario_stock',
    default => throw new InvalidArgumentException('Operación de concurrencia desconocida.'),
};
$observado = false;
DB::listen(static function (QueryExecuted $consulta) use ($tabla, &$observado, $emitir): void {
    if (! $observado && preg_match('/^select\b.*?\bfrom\s+[\x60"]?([a-z_]+)/i', $consulta->sql, $coincidencia) && $coincidencia[1] === $tabla) {
        $observado = true;
        $emitir(['bloqueo' => $tabla, 'for_update' => str_contains(strtolower($consulta->sql), 'for update'), 'transaccion' => $consulta->connection->transactionLevel()]);
    }
});

try {
    $resultado = match ($operacion) {
        'abrir' => app(AbrirCaja::class)->ejecutar(new AbrirCajaDto(50), $usuario),
        'cerrar' => app(CerrarCaja::class)->ejecutar($caja, 50)['sesion'],
        'anular' => app(AnularVenta::class)->ejecutar(new AnularVentaDto('Concurrencia 04b'), $venta, $usuario),
        'movimiento' => app(RegistrarMovimiento::class)->ejecutar(new MovimientoInventarioDto($datos['variante'], $datos['sucursal'], 'salida', 1, 'ajuste', $usuario->id)),
        'compra' => app(RegistrarCompra::class)->ejecutar(new CompraDto($datos['proveedor'], null, [new LineaCompraDto($datos['variante'], 1, 30)]), $usuario),
    };
    $emitir(['resultado' => $operacion, 'id' => $resultado->id]);
} catch (ExcepcionNegocio $excepcion) {
    $emitir(['resultado' => $excepcion->errorCode()]);
}
