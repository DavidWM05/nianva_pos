<?php

namespace App\Modules\Nucleo\Models\Concerns;

use App\Modules\Nucleo\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Aplica TenantScope a cualquier modelo con columna tenant_id. Cada consulta
 * (find, all, where...) queda filtrada automaticamente por el tenant activo,
 * sin que el desarrollador tenga que acordarse de agregar el where.
 *
 * Para cruzar la frontera de tenant (panel de superadmin, mantenimiento,
 * jobs que operan sobre todos los tenants) usa el bypass explicito:
 *
 *      Sucursal::sinTenant()->find($id);
 *
 * Nunca implicito -- si no se llama sinTenant(), el scope siempre filtra.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);
    }

    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScope::class);
    }
}
