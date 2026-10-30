<?php

namespace App\Modules\Apartados\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class ApartadoSaldoInsuficienteException extends ExcepcionNegocio
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

    public function errorCode(): string
    {
        return 'apartado_saldo_insuficiente';
    }

    public function contexto(): array
    {
        return [
            'apartado_id' => $this->apartadoId,
            'total' => $this->total,
            'total_abonado' => $this->totalAbonado,
        ];
    }
}
