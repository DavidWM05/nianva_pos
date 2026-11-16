<?php

declare(strict_types=1);

namespace App\Modules\Precios\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class CuponNoCombinableException extends ExcepcionNegocio
{
    public function __construct(public readonly string $codigo)
    {
        parent::__construct('El cupón no se puede combinar con las promociones de estas líneas.');
    }

    public function errorCode(): string
    {
        return 'cupon_no_combinable';
    }

    /** @return array{codigo: string} */
    public function contexto(): array
    {
        return ['codigo' => $this->codigo];
    }
}
