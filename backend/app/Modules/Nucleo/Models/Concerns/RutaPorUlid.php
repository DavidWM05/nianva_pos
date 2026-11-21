<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Models\Concerns;

/**
 * DAT-08: el binding implícito de la ruta busca por `ulid` en lugar del id interno. Va junto con
 * TieneUlid; con los dos, un valor que no es ULID da 404 sin consultar la base
 * (HasUniqueStringIds::resolveRouteBindingQuery) y el tenant sigue aplicando por el scope global.
 */
trait RutaPorUlid
{
    public function getRouteKeyName(): string
    {
        return 'ulid';
    }
}
