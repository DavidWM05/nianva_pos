<?php

namespace App\Modules\Nucleo\Models\Concerns;

use App\Modules\Nucleo\Scopes\SucursalScope;
use Illuminate\Database\Eloquent\Builder;

/**
 * Aplica SucursalScope a modelos operativos (SEG-01). Los modelos sin
 * sucursal_id propio declaran sucursalRelacion() para filtrar por la
 * sucursal de su relacion. El bypass explicito es Modelo::sinSucursal().
 */
trait BelongsToSucursal
{
    public static function bootBelongsToSucursal(): void
    {
        static::addGlobalScope(new SucursalScope(static::sucursalRelacion()));
    }

    /**
     * @return Builder<*>
     */
    public static function sinSucursal(): Builder
    {
        return static::withoutGlobalScope(SucursalScope::class);
    }

    public static function sucursalRelacion(): ?string
    {
        return null;
    }
}
