<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

/** DAT-10: un atributo o un valor que ya usa alguna variante no se borra. */
class AtributoEnUsoException extends ExcepcionNegocio
{
    public function __construct(private readonly string $tipo, private readonly int $id)
    {
        parent::__construct($tipo === 'valor'
            ? 'Ese valor ya lo usa una o más variantes y no se puede eliminar.'
            : 'Ese atributo ya lo usa una o más variantes y no se puede eliminar.');
    }

    public function errorCode(): string
    {
        return 'atributo_en_uso';
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['tipo' => $this->tipo, 'id' => $this->id];
    }
}
