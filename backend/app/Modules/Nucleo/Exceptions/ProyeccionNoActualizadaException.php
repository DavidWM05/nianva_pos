<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

/**
 * DAT-04: el saldo actual es una proyección del libro y se actualiza en la misma transacción que el
 * renglón. Si el UPDATE no afecta ninguna fila (la proyección no existe o cambió desde que se leyó),
 * la operación falla: nunca se escribe un libro sin su saldo ni un saldo sin su libro.
 */
class ProyeccionNoActualizadaException extends ExcepcionNegocio
{
    public function __construct(private readonly string $proyeccion, private readonly int $id)
    {
        parent::__construct('No se pudo actualizar el saldo; la operación se canceló. Intenta de nuevo.');
    }

    public function errorCode(): string
    {
        return 'proyeccion_no_actualizada';
    }

    public function status(): int
    {
        return 409;
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['proyeccion' => $this->proyeccion, 'id' => $this->id];
    }
}
