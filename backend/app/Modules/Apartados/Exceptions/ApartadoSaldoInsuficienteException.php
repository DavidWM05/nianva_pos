<?php

namespace App\Modules\Apartados\Exceptions;

use RuntimeException;

class ApartadoSaldoInsuficienteException extends RuntimeException
{
    public function __construct(
        public readonly int $apartadoId,
        public readonly float $total,
        public readonly float $totalAbonado,
    ) {
        parent::__construct(
            "El apartado {$apartadoId} no se puede liquidar: abonado {$totalAbonado} de {$total}."
        );
    }
}
