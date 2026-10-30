<?php

namespace App\Modules\Devoluciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class DevolucionVarianteNoVendidaException extends ExcepcionNegocio
{
    public function __construct(
        public readonly int $ventaId,
        public readonly int $varianteId,
    ) {
        parent::__construct("La variante {$varianteId} no forma parte de la venta {$ventaId}.");
    }

    public function errorCode(): string
    {
        return 'devolucion_variante_no_vendida';
    }

    public function contexto(): array
    {
        return [
            'venta_id' => $this->ventaId,
            'variante_id' => $this->varianteId,
        ];
    }
}
