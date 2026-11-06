<?php

declare(strict_types=1);

namespace App\Aplicacion\VentasPlazos;

use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoClienteCuota;
use App\Modules\VentasPlazos\Services\PlanPagoClienteService;
use Illuminate\Support\Facades\DB;

final class MarcarCuotaPagada
{
    public function __construct(private readonly PlanPagoClienteService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(int $planId, int $cuotaId): PlanPagoClienteCuota
    {
        $operacion = function () use ($planId, $cuotaId) {
            PlanPagoCliente::query()->whereKey($planId)->lockForUpdate()->firstOrFail();
            $cuota = PlanPagoClienteCuota::query()->whereKey($cuotaId)->where('plan_pago_cliente_id', $planId)->lockForUpdate()->firstOrFail();

            return $this->service->marcarPagada($cuota);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
