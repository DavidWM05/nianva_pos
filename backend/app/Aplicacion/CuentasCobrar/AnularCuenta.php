<?php

declare(strict_types=1);

namespace App\Aplicacion\CuentasCobrar;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasCobrar\Services\CuentasCobrarService;
use Illuminate\Support\Facades\DB;

final class AnularCuenta
{
    public function __construct(private readonly CuentasCobrarService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(int $cuentaId): void
    {
        $operacion = function () use ($cuentaId) {
            $cuenta = CuentaCobrar::query()->whereKey($cuentaId)->lockForUpdate()->firstOrFail();
            $this->service->anularConCuenta($cuenta);
        };

        if (DB::transactionLevel() > 0) {
            $operacion();
        } else {
            DB::transaction($operacion);
        }
    }
}
