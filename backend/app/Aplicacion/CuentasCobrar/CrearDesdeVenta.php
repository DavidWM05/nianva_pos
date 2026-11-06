<?php

declare(strict_types=1);

namespace App\Aplicacion\CuentasCobrar;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasCobrar\Services\CuentasCobrarService;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;

final class CrearDesdeVenta
{
    public function __construct(private readonly CuentasCobrarService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(int $ventaId, int $diasCredito = 30): CuentaCobrar
    {
        $operacion = function () use ($ventaId, $diasCredito) {
            $venta = Venta::query()->whereKey($ventaId)->lockForUpdate()->firstOrFail();

            return $this->service->crearDesdeVenta($venta, $diasCredito);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
