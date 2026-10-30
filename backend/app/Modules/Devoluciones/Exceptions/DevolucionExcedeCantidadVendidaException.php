<?php

namespace App\Modules\Devoluciones\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class DevolucionExcedeCantidadVendidaException extends ExcepcionNegocio
{
    public function __construct(
        public readonly int $ventaId,
        public readonly int $varianteId,
        public readonly int $solicitado,
        public readonly int $vendido,
    ) {
        parent::__construct(
            "No se pueden devolver {$solicitado} unidades de la variante {$varianteId}: ".
            "la venta {$ventaId} solo vendio {$vendido}."
        );
    }

    public function errorCode(): string
    {
        return 'devolucion_excede_cantidad_vendida';
    }

    public function contexto(): array
    {
        return [
            'venta_id' => $this->ventaId,
            'variante_id' => $this->varianteId,
            'solicitado' => $this->solicitado,
            'vendido' => $this->vendido,
        ];
    }
}
