<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Casts;

use App\Modules\Nucleo\Support\Cantidad;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** @implements CastsAttributes<string, int|float|string|null> */
final class CantidadFormateada implements CastsAttributes
{
    public function __construct(private readonly string $decimalesPublicos) {}

    public function get(Model $model, string $key, mixed $value, array $attributes): string
    {
        $numero = Cantidad::numero($value);
        $decimales = max((int) $this->decimalesPublicos, Cantidad::milesimas($value) % 10 === 0 ? 0 : 3);

        return number_format($numero, $decimales, '.', '');
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        return $value === null ? null : Cantidad::cadena($value);
    }
}
