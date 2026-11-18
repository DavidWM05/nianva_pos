<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

/** DAT-04: un renglón de un libro de movimientos no se actualiza ni se borra. */
class LibroInmutableException extends ExcepcionNegocio
{
    public function __construct(private readonly string $libro, private readonly string $operacion)
    {
        parent::__construct("El libro {$libro} es de solo inserción: no se puede {$operacion} un renglón; registra un movimiento nuevo.");
    }

    public function errorCode(): string
    {
        return 'libro_inmutable';
    }

    public function status(): int
    {
        return 409;
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['libro' => $this->libro, 'operacion' => $this->operacion];
    }
}
