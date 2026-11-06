<?php

declare(strict_types=1);

namespace App\Aplicacion\VentasPlazos;

use App\Modules\Tpv\Models\Venta;
use App\Modules\VentasPlazos\Dtos\CrearPlanPagoDto;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Services\VentasPlazosService;
use Illuminate\Support\Facades\DB;

final class CrearPlanPago
{
    public function __construct(private readonly VentasPlazosService $service) {}

    /** Reutiliza la transacción llamadora; conserva los bloqueos hasta el commit exterior. */
    public function ejecutar(CrearPlanPagoDto $dto, int $ventaId): PlanPagoCliente
    {
        $operacion = function () use ($dto, $ventaId) {
            $venta = Venta::query()->whereKey($ventaId)->lockForUpdate()->firstOrFail();

            return $this->service->crearPlan($venta, $dto->datosParaServicio());
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
