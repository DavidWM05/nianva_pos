<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Support\Cantidad;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use InvalidArgumentException;
use OverflowException;

final class PresentacionDeVariante implements DataAwareRule, ValidationRule
{
    /** @var array<string,mixed> */
    private array $datos = [];

    public function __construct(private readonly int $tenantId) {}

    /** @param array<string,mixed> $data */
    public function setData(array $data): static
    {
        $this->datos = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_numeric($value)) {
            return;
        }
        $prefijo = substr($attribute, 0, strrpos($attribute, '.') + 1);
        $varianteId = data_get($this->datos, $prefijo.'variante_id');
        if (! is_numeric($varianteId)) {
            return;
        }
        $p = Presentacion::query()->where('tenant_id', $this->tenantId)->where('variante_id', $varianteId)->whereKey((int) $value)->first();
        if ($p === null) {
            $fail('La presentación debe pertenecer a la variante y al tenant.');

            return;
        }
        $cantidad = data_get($this->datos, $prefijo.'cantidad');
        if (! is_numeric($cantidad)) {
            return;
        }
        try {
            $base = Cantidad::multiplicar($cantidad, $p->getAttribute('factor'));
            $v = ProductoVariante::query()->whereKey($varianteId)->firstOrFail();
            if (! $v->getAttribute('es_granel') && Cantidad::milesimas($base) % 1000 !== 0) {
                $fail('La cantidad en unidad base de una variante por pieza debe ser entera.');
            }
        } catch (InvalidArgumentException|OverflowException $error) {
            $fail($error->getMessage());
        }
    }
}
