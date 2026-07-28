<?php

namespace App\Modules\UnidadesMedida\Exceptions;

use RuntimeException;

class UnidadEnUsoException extends RuntimeException
{
    public function __construct(int $unidadMedidaId)
    {
        parent::__construct("La unidad de medida {$unidadMedidaId} está siendo usada por una o más variantes de producto y no se puede eliminar.");
    }
}
