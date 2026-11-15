<?php

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Nucleo\Support\DecimalApi;

class VentaTotalNegativoException extends ExcepcionNegocio
{
    public function __construct(
        public readonly float $subtotal,
        public readonly float $descuentoManual,
        public readonly float $descuentoCupon,
    ) {
        parent::__construct('El total de la venta no puede quedar negativo.');
    }

    public function errorCode(): string
    {
        return 'venta_total_negativo';
    }

    public function contexto(): array
    {
        return [
            'subtotal' => DecimalApi::dinero($this->subtotal),
            'descuento_manual' => DecimalApi::dinero($this->descuentoManual),
            'descuento_cupon' => DecimalApi::dinero($this->descuentoCupon),
        ];
    }
}
