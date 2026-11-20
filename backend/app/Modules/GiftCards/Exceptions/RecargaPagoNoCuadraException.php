<?php

declare(strict_types=1);

namespace App\Modules\GiftCards\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class RecargaPagoNoCuadraException extends ExcepcionNegocio
{
    public function __construct(private readonly string $monto, private readonly string $suma)
    {
        parent::__construct('La suma de los pagos no coincide con el monto de la recarga.');
    }

    public function errorCode(): string
    {
        return 'recarga_pago_no_cuadra';
    }

    /** @return array<string, string> */
    public function contexto(): array
    {
        return ['monto' => $this->monto, 'suma_pagos' => $this->suma];
    }
}
