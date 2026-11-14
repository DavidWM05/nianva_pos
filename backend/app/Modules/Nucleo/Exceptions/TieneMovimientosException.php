<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

/**
 * DAT-10: el borrado fisico solo procede sin dependencias. `entidad` e `id` dicen cual registro
 * se intento borrar, y el mensaje explica que lo detiene.
 */
class TieneMovimientosException extends ExcepcionNegocio
{
    public function __construct(
        public readonly string $entidad,
        public readonly int $id,
        string $mensaje,
    ) {
        parent::__construct($mensaje);
    }

    public function errorCode(): string
    {
        return 'tiene_movimientos';
    }

    /** @return array{entidad: string, id: int} */
    public function contexto(): array
    {
        return [
            'entidad' => $this->entidad,
            'id' => $this->id,
        ];
    }
}
