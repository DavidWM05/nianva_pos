<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Dtos;

final readonly class CodigoVentaDto
{
    public function __construct(public int $varianteId, public string $productoNombre, public ?int $presentacionId, public ?string $presentacionNombre, public string $factor, public string $stockActual) {}
}
