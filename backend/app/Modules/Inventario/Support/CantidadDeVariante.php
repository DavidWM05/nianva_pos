<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Support\Cantidad;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

final class CantidadDeVariante implements DataAwareRule, ValidationRule
{
    /** @var array<string, mixed> */
    private array $datos = [];

    public function __construct(private readonly int $tenantId, private readonly string $campoVariante = 'variante_id', private readonly ?int $varianteId = null) {}

    /** @param array<string, mixed> $data */
    public function setData(array $data): static
    {
        $this->datos = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_numeric($value) || ! is_finite((float) $value) || abs((float) $value) > 99999999999.999) {
            return;
        }
        $posicion = strrpos($attribute, '.');
        $prefijo = $posicion === false ? '' : substr($attribute, 0, $posicion + 1);
        $id = $this->varianteId ?? data_get($this->datos, $prefijo.$this->campoVariante);
        $variante = ProductoVariante::sinTenant()->where('tenant_id', $this->tenantId)->whereKey($id)->first();
        if ($variante !== null && ! $variante->getAttribute('es_granel') && Cantidad::milesimas($value) % 1000 !== 0) {
            $fail('La cantidad de una variante por pieza debe ser entera.');
        }
    }
}
