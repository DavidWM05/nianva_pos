<?php

namespace App\Modules\Tpv\Support;

use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * caja_sesiones no tiene tenant_id propio: el scope se aplica sobre la
 * sucursal (API-05).
 */
final class ReglasCaja
{
    public static function delTenant(int $tenantId): Exists
    {
        return self::delTenantPor('id', $tenantId);
    }

    /** DAT-08: la entrada trae el ulid publicado de la sesión de caja. */
    public static function delTenantPorUlid(int $tenantId): Exists
    {
        return self::delTenantPor('ulid', $tenantId);
    }

    private static function delTenantPor(string $columna, int $tenantId): Exists
    {
        return Rule::exists('caja_sesiones', $columna)->where(
            fn ($query) => $query->whereIn(
                'sucursal_id',
                Sucursal::sinTenant()->where('tenant_id', $tenantId)->select('id'),
            ),
        );
    }
}
