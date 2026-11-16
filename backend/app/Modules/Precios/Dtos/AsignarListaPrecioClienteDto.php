<?php

declare(strict_types=1);

namespace App\Modules\Precios\Dtos;

final readonly class AsignarListaPrecioClienteDto
{
    public function __construct(public int $clienteId) {}
}
