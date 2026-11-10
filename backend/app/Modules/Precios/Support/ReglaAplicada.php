<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class ReglaAplicada
{
    /** Prioridad de cascada: 1 variante, 2 producto, 3 categoría, 4 todo. */
    public function __construct(public int $id, public string $tipo, public int $prioridad, public bool $combinable = false) {}
}
