<?php

declare(strict_types=1);

namespace App\Aplicacion\CuentasPagar;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\CuentasPagar\Services\CuentasPagarService;
use App\Modules\Inventario\Models\Compra;
use Illuminate\Support\Facades\DB;

final class CrearDesdeCompra
{
    public function __construct(private readonly CuentasPagarService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(int $compraId, int $diasCredito = 30): CuentaPagar
    {
        $operacion = function () use ($compraId, $diasCredito) {
            $compra = Compra::query()->whereKey($compraId)->lockForUpdate()->firstOrFail();

            return $this->service->crearDesdeCompra($compra, $diasCredito);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
