<?php

declare(strict_types=1);

namespace App\Aplicacion\VentasPlazos;

use App\Modules\VentasPlazos\Dtos\PagarCuotaDto;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoClienteCuota;
use App\Modules\VentasPlazos\Services\VentasPlazosService;
use Illuminate\Support\Facades\DB;

final class PagarCuota
{
    public function __construct(private readonly VentasPlazosService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(PagarCuotaDto $dto, int $planId): PlanPagoClienteCuota
    {
        $operacion = function () use ($dto, $planId) {
            PlanPagoCliente::query()->whereKey($planId)->lockForUpdate()->firstOrFail();
            $cuota = PlanPagoClienteCuota::query()->whereKey($dto->cuotaId)->where('plan_pago_cliente_id', $planId)->lockForUpdate()->firstOrFail();

            return $this->service->pagarCuotaConCuota($cuota, $dto->datosParaServicio());
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
