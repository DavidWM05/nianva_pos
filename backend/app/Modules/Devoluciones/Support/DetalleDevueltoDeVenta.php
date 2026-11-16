<?php

declare(strict_types=1);

namespace App\Modules\Devoluciones\Support;

use App\Modules\Tpv\Models\VentaDetalle;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Builder;

final class DetalleDevueltoDeVenta implements DataAwareRule, ValidationRule
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
        $prefijo = substr($attribute, 0, strrpos($attribute, '.') + 1);
        $variante = data_get($this->datos, $prefijo.'variante_id');
        $venta = $this->datos['venta_id'] ?? null;
        if (! is_numeric($value) || ! is_numeric($variante) || ! is_numeric($venta)) {
            return;
        }
        if (! VentaDetalle::query()->whereKey((int) $value)->where('venta_id', (int) $venta)->where('variante_id', (int) $variante)->whereHas('venta', fn (Builder $q) => $q->where('tenant_id', $this->tenantId))->exists()) {
            $fail('La línea devuelta debe pertenecer a la venta, variante y tenant.');
        }
    }
}
