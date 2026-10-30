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
        return Rule::exists('caja_sesiones', 'id')->where(
            fn ($query) => $query->whereIn(
                'sucursal_id',
                Sucursal::sinTenant()->where('tenant_id', $tenantId)->select('id'),
            ),
        );
    }
}
