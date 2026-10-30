<?php

namespace App\Modules\Apartados\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class ApartadoEstadoInvalidoException extends ExcepcionNegocio
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

    public function errorCode(): string
    {
        return 'apartado_estado_invalido';
    }

    public function contexto(): array
    {
        return [
            'apartado_id' => $this->apartadoId,
            'estado_actual' => $this->estadoActual,
            'accion' => $this->accion,
        ];
    }
}
