<?php

namespace App\Modules\Nucleo\Scopes;

use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Filtra automaticamente cualquier consulta a un modelo con tenant_id segun
 * el tenant activo en TenantContext. Tres estados posibles:
 *
 * 1. TenantContext nunca se resolvio (comandos artisan, tinker, jobs en cola,
 *    o el instante en que el guard de auth resuelve Usuario::find() DENTRO de
 *    ResolveTenant, antes de que el propio middleware determine el tenant):
 *    no se aplica ningun filtro. Es una excepcion deliberada -- de lo
 *    contrario romperia el login (el guard busca al usuario por id antes de
 *    saber a que tenant pertenece) y obligaria a herramientas internas a
 *    pelear con el scope en cada uso.
 *
 * 2. TenantContext resuelto con un tenant activo: se filtra a
 *    tenant_id = <tenant activo> OR tenant_id IS NULL (los registros de
 *    sistema/globales siempre son visibles, sin necesidad de bypass).
 *
 * 3. TenantContext resuelto pero SIN tenant (superadmin, tenant_id NULL en
 *    usuarios): solo ve los registros globales (tenant_id IS NULL). Ver
 *    datos de un tenant especifico requiere el bypass explicito
 *    Modelo::sinTenant() -- nunca es automatico, ni siquiera para superadmin.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantContext = app(TenantContext::class);

        if (! $tenantContext->resuelto()) {
            return;
        }

        $columna = $model->qualifyColumn('tenant_id');

        if ($tenantContext->tieneTenant()) {
            $builder->where(function (Builder $query) use ($columna, $tenantContext) {
                $query->where($columna, $tenantContext->id())
                    ->orWhereNull($columna);
            });

            return;
        }

        $builder->whereNull($columna);
    }
}
