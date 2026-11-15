<?php

namespace App\Modules\Devoluciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Nucleo\Support\DecimalApi;

class DevolucionPagoNoCuadraException extends ExcepcionNegocio
{
    public function __construct(public readonly float $diferencia, public readonly float $sumaPagos)
    {
        parent::__construct(
            "La suma de los pagos ({$sumaPagos}) no coincide con la diferencia a liquidar ({$diferencia})."
        );
    }

    public function errorCode(): string
    {
        return 'devolucion_pago_no_cuadra';
    }

    public function contexto(): array
    {
        return [
            'diferencia' => DecimalApi::dinero($this->diferencia),
            'suma_pagos' => DecimalApi::dinero($this->sumaPagos),
        ];
    }
}
