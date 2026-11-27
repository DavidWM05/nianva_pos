<?php

declare(strict_types=1);

namespace App\Aplicacion\CuentasPagar;

use App\Aplicacion\Caja\CajaDeTerminal;
use App\Modules\CuentasPagar\Dtos\RegistrarPagoDto;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\CuentasPagar\Services\CuentasPagarService;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Services\LibroCaja;
use Illuminate\Support\Facades\DB;

final class RegistrarPago
{
    public function __construct(private readonly CuentasPagarService $service, private readonly LibroCaja $libro) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(RegistrarPagoDto $dto, int $cuentaId, Usuario $usuario, ?Terminal $terminal = null): AbonoPagar
    {
        $operacion = function () use ($dto, $cuentaId, $usuario, $terminal) {
            // Bloquear la caja de la terminal antes del documento.
            $caja = CajaDeTerminal::bloquearAbierta($usuario, $terminal);
            $cuenta = CuentaPagar::query()->whereKey($cuentaId)->lockForUpdate()->firstOrFail();

            $abono = $this->service->registrarPagoConBloqueos($cuenta, [
                'sucursal_id' => (int) $usuario->getAttribute('sucursal_id'),
                'usuario_id' => $usuario->id,
                'monto' => $dto->monto,
                'metodo_pago_id' => $dto->metodoPagoId,
                'referencia' => $dto->referencia,
            ], $caja);
            if ($caja !== null && $this->libro->esMonetario($dto->metodoPagoId)) {
                $this->libro->registrar($caja, 'pago_cxp', Dinero::desde('0')->restar(Dinero::desde((string) $dto->monto))->aCadena(), 'abonos_pagar', (int) $abono->id, (int) $usuario->id, $dto->metodoPagoId);
            }

            return $abono;
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
