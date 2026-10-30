<?php

namespace App\Modules\Nucleo\Support;

use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Reglas de existencia con scope de tenant (API-05).
 *
 * existe(): tablas con tenant_id NOT NULL.
 * existeGlobalODelTenant(): tablas con tenant_id nullable, donde los
 * registros globales (tenant_id NULL) tambien son validos.
 */
final class ReglasTenant
{
    public static function existe(string $tabla, int $tenantId): Exists
    {
        return Rule::exists($tabla, 'id')->where('tenant_id', $tenantId);
    }

    public static function existeGlobalODelTenant(string $tabla, int $tenantId): Exists
    {
        return Rule::exists($tabla, 'id')->where(
            fn ($query) => $query->whereNull('tenant_id')->orWhere('tenant_id', $tenantId),
        );
    }
}
