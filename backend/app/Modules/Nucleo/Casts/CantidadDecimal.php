<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Casts;

use App\Modules\Nucleo\Support\Cantidad;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** @implements CastsAttributes<int|float, int|float|string|null> */
final class CantidadDecimal implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): int|float
    {
        return Cantidad::numero($value);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : Cantidad::cadena($value);
    }
}
