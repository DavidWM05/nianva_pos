<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** @implements CastsAttributes<string|null, int|float|string|null> */
final class CantidadFormateadaNullable implements CastsAttributes
{
    private readonly CantidadFormateada $cast;

    public function __construct(string $decimalesPublicos)
    {
        $this->cast = new CantidadFormateada($decimalesPublicos);
    }

    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : $this->cast->get($model, $key, $value, $attributes);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $this->cast->set($model, $key, $value, $attributes);
    }
}
