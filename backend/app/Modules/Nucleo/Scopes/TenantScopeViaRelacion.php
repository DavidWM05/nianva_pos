<?php

namespace App\Modules\Nucleo\Scopes;

use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Igual que TenantScope, pero para modelos que NO tienen columna tenant_id
 * propia y heredan su tenant a traves de una relacion belongsTo hacia un
 * modelo que si la tiene (ej. ProductoVariante -> producto, InventarioStock
 * -> sucursal). El filtro se hace con whereHas($relacion) en vez de una
 * columna directa, pero replica exactamente los mismos tres estados que
 * TenantScope (sin resolver = sin filtro, con tenant = tenant O global,
 * sin tenant = solo global).
 */
class TenantScopeViaRelacion implements Scope
{
    public function __construct(private readonly string $relacion)
    {
    }

    public function apply(Builder $builder, Model $model): void
    {
        $tenantContext = app(TenantContext::class);

        if (! $tenantContext->resuelto()) {
            return;
        }

        if ($tenantContext->tieneTenant()) {
            $builder->whereHas($this->relacion, function (Builder $query) use ($tenantContext) {
                $columna = $query->getModel()->qualifyColumn('tenant_id');

                $query->where(function (Builder $q) use ($columna, $tenantContext) {
                    $q->where($columna, $tenantContext->id())->orWhereNull($columna);
                });
            });

            return;
        }

        $builder->whereHas($this->relacion, function (Builder $query) {
            $query->whereNull($query->getModel()->qualifyColumn('tenant_id'));
        });
    }
}
