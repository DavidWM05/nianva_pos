<?php

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PagoNoCuadraException extends ExcepcionNegocio
{
    public function __construct(public readonly float $total, public readonly float $sumaPagos)
    {
        parent::__construct(
            "La suma de los pagos ({$sumaPagos}) no coincide con el total de la venta ({$total})."
        );
    }

    public function errorCode(): string
    {
        return 'pago_no_cuadra';
    }

    public function contexto(): array
    {
        return [
            'total' => $this->total,
            'suma_pagos' => $this->sumaPagos,
        ];
    }
}
