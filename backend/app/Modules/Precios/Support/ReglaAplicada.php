<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class ReglaAplicada
{
    /** Prioridad configurable de negocio; el nivel de cascada solo desempata. */
    public function __construct(public int $id, public string $tipo, public int $prioridad, public bool $combinable = false, public float $descuento = 0.0) {}
}
