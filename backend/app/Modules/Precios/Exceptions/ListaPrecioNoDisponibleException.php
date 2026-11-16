<?php

declare(strict_types=1);

namespace App\Modules\Precios\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class ListaPrecioNoDisponibleException extends ExcepcionNegocio
{
    public function __construct(public readonly int $listaPrecioId)
    {
        parent::__construct('La lista de precio no está disponible para este tenant.');
    }

    public function errorCode(): string
    {
        return 'lista_precio_no_disponible';
    }

    /** @return array{lista_precio_id: int} */
    public function contexto(): array
    {
        return ['lista_precio_id' => $this->listaPrecioId];
    }
}
