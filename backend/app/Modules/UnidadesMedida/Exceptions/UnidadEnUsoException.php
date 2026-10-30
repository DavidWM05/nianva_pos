<?php

namespace App\Modules\UnidadesMedida\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class UnidadEnUsoException extends ExcepcionNegocio
{
    public function __construct(int $unidadMedidaId)
    {
        parent::__construct("La unidad de medida {$unidadMedidaId} está siendo usada por una o más variantes de producto y no se puede eliminar.");
    }

    public function errorCode(): string
    {
        return 'unidad_en_uso';
    }
}
