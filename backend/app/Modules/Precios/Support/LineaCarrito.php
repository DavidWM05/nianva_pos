<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class LineaCarrito
{
    public function __construct(public int $varianteId, public int $cantidad) {}
}
