<?php

declare(strict_types=1);

namespace App\Aplicacion\CuentasPagar;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\CuentasPagar\Services\CuentasPagarService;
use Illuminate\Support\Facades\DB;

final class AnularCuenta
{
    public function __construct(private readonly CuentasPagarService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(int $cuentaId): void
    {
        $operacion = function () use ($cuentaId) {
            $cuenta = CuentaPagar::query()->whereKey($cuentaId)->lockForUpdate()->firstOrFail();
            $this->service->anularConCuenta($cuenta);
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
