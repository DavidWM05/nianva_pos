<?php

namespace App\Modules\Inventario\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Nucleo\Support\DecimalApi;

class StockInsuficienteException extends ExcepcionNegocio
{
    public function __construct(
        public readonly int $varianteId,
        public readonly int $sucursalId,
        public readonly int|float $solicitado,
        public readonly int|float $disponible,
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
            'solicitado' => DecimalApi::cantidad($this->solicitado),
            'disponible' => DecimalApi::cantidad($this->disponible),
        ];
    }
}
