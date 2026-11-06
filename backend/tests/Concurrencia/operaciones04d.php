<?php

declare(strict_types=1);

use App\Aplicacion\CuentasCobrar\RegistrarAbono;
use App\Aplicacion\CuentasPagar\RegistrarPago;
use App\Aplicacion\GiftCards\CargarGiftCard;
use App\Aplicacion\GiftCards\RecargarGiftCard;
use App\Aplicacion\NotasCredito\AplicarNotaCredito;
use App\Aplicacion\VentasPlazos\PagarCuota;
use App\Modules\CuentasCobrar\Dtos\RegistrarAbonoDto;
use App\Modules\CuentasPagar\Dtos\RegistrarPagoDto;
use App\Modules\GiftCards\Dtos\CargarGiftCardDto;
use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\NotasCredito\Dtos\AplicarNotaCreditoDto;
use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\VentasPlazos\Dtos\PagarCuotaDto;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;

$op = $argv[1];
$tabla = match ($op) {
    'cxc_abonar', 'l04' => 'cuentas_cobrar',
    'cxp_pagar' => 'cuentas_pagar',
    'gift_cargar', 'gift_recargar' => 'gift_cards',
    'nota_aplicar' => 'notas_credito',
    'cuota_pagar' => 'planes_pago_cliente_cuotas',
};
// La instantánea se toma antes de intentar los bloqueos: ambos hijos ven el mismo saldo.
if ($op === 'l04') {
    $emitir(['saldo_inicial' => (float) DB::table($tabla)->where('id', $datos['cxc'])->value('saldo_pendiente')]);
}
$observado = false;
DB::listen(static function (QueryExecuted $consulta) use ($tabla, &$observado, $emitir): void {
    if (! $observado && preg_match('/^select\b.*?\bfrom\s+[\x60"]?([a-z_]+)/i', $consulta->sql, $m) && $m[1] === $tabla) {
        $observado = true;
        $emitir(['bloqueo' => $tabla, 'for_update' => str_contains(strtolower($consulta->sql), 'for update'), 'transaccion' => $consulta->connection->transactionLevel()]);
    }
});
try {
    match ($op) {
        'cxc_abonar', 'l04' => app(RegistrarAbono::class)->ejecutar(new RegistrarAbonoDto($op === 'l04' ? 75 : 25, $datos['metodo'], null), $datos['cxc'], $usuario),
        'cxp_pagar' => app(RegistrarPago::class)->ejecutar(new RegistrarPagoDto(75, $datos['metodo'], null), $datos['cxp'], $usuario),
        'gift_cargar' => app(CargarGiftCard::class)->ejecutar(new CargarGiftCardDto($datos['gift'], 75)),
        'gift_recargar' => app(RecargarGiftCard::class)->ejecutar(new RecargarGiftCardDto(30), $datos['gift'], $usuario),
        'nota_aplicar' => app(AplicarNotaCredito::class)->ejecutar(new AplicarNotaCreditoDto($datos['nota'], $datos['venta'], 75)),
        'cuota_pagar' => app(PagarCuota::class)->ejecutar(new PagarCuotaDto($datos['cuota'], 100, ['monto']), $datos['plan']),
    };
    $emitir(['resultado' => $op]);
} catch (ExcepcionNegocio $error) {
    $emitir(['resultado' => $error->errorCode()]);
} catch (Throwable $error) {
    fwrite(STDERR, $error::class.': '.$error->getMessage());
    exit(1);
}
