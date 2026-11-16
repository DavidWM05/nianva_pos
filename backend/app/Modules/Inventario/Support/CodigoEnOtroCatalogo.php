<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

final readonly class CodigoEnOtroCatalogo implements ValidationRule
{
    public function __construct(private string $tabla, private int $tenantId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (is_string($value) && $value !== '' && DB::table($this->tabla)->where('tenant_id', $this->tenantId)->where('codigo_barras', $value)->exists()) {
            $fail('El código de barras ya está en uso en el catálogo del tenant.');
        }
    }
}
