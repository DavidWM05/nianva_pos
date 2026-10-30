<?php

namespace App\Modules\Inventario\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class StockInsuficienteException extends ExcepcionNegocio
{
    public function __construct(
        public readonly int $varianteId,
        public readonly int $sucursalId,
        public readonly int $solicitado,
        public readonly int $disponible,
    ) {
        parent::__construct(
            "Stock insuficiente para la variante {$varianteId} en la sucursal {$sucursalId}: ".
            "se solicitaron {$solicitado} unidades, hay {$disponible} disponibles."
        );
    }

    public function errorCode(): string
    {
        return 'stock_insuficiente';
    }

    public function contexto(): array
    {
        return [
            'variante_id' => $this->varianteId,
            'sucursal_id' => $this->sucursalId,
            'solicitado' => $this->solicitado,
            'disponible' => $this->disponible,
        ];
    }
}
