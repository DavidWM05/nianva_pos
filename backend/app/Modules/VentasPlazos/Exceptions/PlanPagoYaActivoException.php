<?php

namespace App\Modules\VentasPlazos\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PlanPagoYaActivoException extends ExcepcionNegocio
{
    public function __construct(
        public readonly int $ventaId,
        public readonly int $planPagoId,
    ) {
        parent::__construct("La venta {$ventaId} ya tiene un plan de pago activo.");
    }

    public function errorCode(): string
    {
        return 'plan_pago_ya_activo';
    }

    public function contexto(): array
    {
        return [
            'venta_id' => $this->ventaId,
            'plan_pago_id' => $this->planPagoId,
        ];
    }
}
