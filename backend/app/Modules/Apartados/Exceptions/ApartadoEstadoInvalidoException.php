<?php

namespace App\Modules\Apartados\Exceptions;

use RuntimeException;

class ApartadoEstadoInvalidoException extends RuntimeException
{
    public function __construct(
        public readonly int $apartadoId,
        public readonly string $estadoActual,
        public readonly string $accion,
    ) {
        parent::__construct(
            "No se puede {$this->accion} el apartado {$apartadoId}: su estado actual es '{$estadoActual}', se esperaba 'activo'."
        );
    }
}
