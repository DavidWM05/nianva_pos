<?php

namespace App\Modules\Inventario\Support;

use App\Modules\Inventario\Models\Producto;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Regla reutilizable para validar que una variante pertenezca al tenant
 * activo. producto_variantes no tiene tenant_id propio: el scope se aplica
 * sobre producto.tenant_id (API-05).
 */
final class ReglasVariante
{
    public static function delTenant(int $tenantId): Exists
    {
        return Rule::exists('producto_variantes', 'id')->where(
            fn ($query) => $query->whereIn(
                'producto_id',
                Producto::sinTenant()->where('tenant_id', $tenantId)->select('id'),
            ),
        );
    }
}
