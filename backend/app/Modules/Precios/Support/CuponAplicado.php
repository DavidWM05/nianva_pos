<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

use App\Modules\Precios\Models\Cupon;

final readonly class CuponAplicado
{
    public function __construct(public int $id, public float $descuento, private Cupon $cupon) {}

    public function modelo(): Cupon
    {
        return $this->cupon;
    }
}
