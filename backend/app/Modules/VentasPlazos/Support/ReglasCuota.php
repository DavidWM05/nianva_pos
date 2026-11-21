<?php

namespace App\Modules\VentasPlazos\Support;

use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * planes_pago_cliente_cuotas no tiene tenant_id propio: el scope se aplica
 * sobre el plan padre (API-05).
 */
final class ReglasCuota
{
    public static function delTenant(int $tenantId): Exists
    {
        return self::delTenantPor('id', $tenantId);
    }

    /** DAT-08: la entrada trae el ulid publicado de la cuota. */
    public static function delTenantPorUlid(int $tenantId): Exists
    {
        return self::delTenantPor('ulid', $tenantId);
    }

    private static function delTenantPor(string $columna, int $tenantId): Exists
    {
        return Rule::exists('planes_pago_cliente_cuotas', $columna)->where(
            fn ($query) => $query->whereIn(
                'plan_pago_cliente_id',
                PlanPagoCliente::sinTenant()->where('tenant_id', $tenantId)->select('id'),
            ),
        );
    }
}
