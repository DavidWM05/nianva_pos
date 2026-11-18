<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

/**
 * DAT-03: la foto de una línea necesita unidad. Una variante sin unidad propia se vende en la
 * «Pieza» global (`pz`); si esa fila no existe, la operación falla en vez de guardar null.
 */
class UnidadPiezaNoExisteException extends ExcepcionNegocio
{
    public function __construct(private readonly int $varianteId)
    {
        parent::__construct('La variante no tiene unidad y no existe la unidad global «Pieza» para registrarla.');
    }

    public function errorCode(): string
    {
        return 'unidad_pieza_no_existe';
    }

    public function status(): int
    {
        return 409;
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['variante_id' => $this->varianteId];
    }
}
