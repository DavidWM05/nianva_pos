<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

/**
 * DAT-03: la foto de una línea no se completa con ceros ni defaults. Si falta un dato (precio,
 * descuento, costo…), la operación falla con esta excepción en vez de guardar un valor inventado.
 */
class FotoIncompletaException extends ExcepcionNegocio
{
    public function __construct(private readonly string $campo, private readonly int $varianteId)
    {
        parent::__construct("Falta el dato «{$campo}» para registrar la línea.");
    }

    public function errorCode(): string
    {
        return 'foto_incompleta';
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['campo' => $this->campo, 'variante_id' => $this->varianteId];
    }
}
