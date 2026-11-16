<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use App\Modules\Inventario\Models\Atributo;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * ARQ-07: atributo_valores no tiene tenant_id propio; el scope se aplica sobre atributos.tenant_id
 * (SEG-01), igual que ReglasVariante con producto.tenant_id.
 */
final class ReglasAtributo
{
    public static function valorDelTenant(int $tenantId): Exists
    {
        return Rule::exists('atributo_valores', 'id')->where(
            fn ($query) => $query->whereIn(
                'atributo_id',
                Atributo::sinTenant()->where('tenant_id', $tenantId)->select('id'),
            ),
        );
    }
}
