<?php

namespace App\Modules\Apartados\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class AbonoPagoNoCuadraException extends ExcepcionNegocio
{
    public function __construct(public readonly float $monto, public readonly float $sumaPagos)
    {
        parent::__construct(
            "La suma de los pagos ({$sumaPagos}) no coincide con el monto del abono ({$monto})."
        );
    }

    public function errorCode(): string
    {
        return 'abono_pago_no_cuadra';
    }

    public function contexto(): array
    {
        return [
            'monto' => $this->monto,
            'suma_pagos' => $this->sumaPagos,
        ];
    }
}
