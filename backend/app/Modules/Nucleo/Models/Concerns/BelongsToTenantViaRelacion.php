<?php

namespace App\Modules\Nucleo\Models\Concerns;

use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Database\Eloquent\Builder;

/**
 * Igual que BelongsToTenant, pero para modelos sin columna tenant_id
 * propia: el aislamiento se resuelve consultando la relacion que devuelve
 * tenantRelacion(), que debe apuntar (directo o indirectamente) a un
 * modelo con tenant_id. Mismo bypass explicito Modelo::sinTenant().
 *
 * Ejemplo: ProductoVariante no tiene tenant_id, pero belongsTo(Producto)
 * que si lo tiene -> tenantRelacion() devuelve 'producto'.
 */
trait BelongsToTenantViaRelacion
{
    public static function bootBelongsToTenantViaRelacion(): void
    {
        static::addGlobalScope(new TenantScopeViaRelacion(static::tenantRelacion()));
    }

    public static function sinTenant(): Builder
    {
        return static::withoutGlobalScope(TenantScopeViaRelacion::class);
    }

    /**
     * Nombre del metodo de relacion (belongsTo) hacia el modelo del que se
     * hereda el tenant. Cada modelo que use este trait debe implementarlo.
     */
    abstract public static function tenantRelacion(): string;
}
