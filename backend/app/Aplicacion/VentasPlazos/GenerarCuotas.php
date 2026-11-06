<?php

declare(strict_types=1);

namespace App\Aplicacion\VentasPlazos;

use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoClienteCuota;
use App\Modules\VentasPlazos\Services\PlanPagoClienteService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class GenerarCuotas
{
    public function __construct(private readonly PlanPagoClienteService $service) {}

    /**
     * Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior.
     *
     * @return Collection<int, PlanPagoClienteCuota>
     */
    public function ejecutar(int $planId, int $numeroCuotas): Collection
    {
        $operacion = function () use ($planId, $numeroCuotas) {
            $plan = PlanPagoCliente::query()->whereKey($planId)->lockForUpdate()->firstOrFail();

            return $this->service->generarCuotas($plan, $numeroCuotas);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
