<?php

namespace App\Modules\Cotizaciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CotizacionTotalNegativoException extends ExcepcionNegocio
{
    public function __construct(
        public readonly float $subtotal,
        public readonly float $descuento,
    ) {
        parent::__construct('El total de la cotizacion no puede quedar negativo.');
    }

    public function errorCode(): string
    {
        return 'cotizacion_total_negativo';
    }

    public function contexto(): array
    {
        return [
            'subtotal' => $this->subtotal,
            'descuento' => $this->descuento,
        ];
    }
}
