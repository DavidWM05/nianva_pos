<?php

namespace App\Modules\Crm\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuotaYaPagadaException extends ExcepcionNegocio
{
    public function __construct(
        public readonly int $planPagoId,
        public readonly int $cuotaId,
    ) {
        parent::__construct("La cuota {$cuotaId} ya está pagada.");
    }

    public function errorCode(): string
    {
        return 'cuota_ya_pagada';
    }

    public function contexto(): array
    {
        return [
            'plan_pago_id' => $this->planPagoId,
            'cuota_id' => $this->cuotaId,
        ];
    }
}
