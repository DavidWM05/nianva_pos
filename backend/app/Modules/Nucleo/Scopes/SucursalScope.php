<?php

namespace App\Modules\Nucleo\Scopes;

use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Filtra por la sucursal del usuario autenticado (SEG-01). No aplica en
 * consola/jobs/seeders (sin usuario autenticado), ni a quien tiene
 * sucursales.todas. El bypass explicito es Modelo::sinSucursal().
 */
/** @implements Scope<Model> */
class SucursalScope implements Scope
{
    public function __construct(private readonly ?string $relacion = null) {}

    public function apply(Builder $builder, Model $model): void
    {
        $usuario = Auth::user();

        if (! $usuario instanceof Usuario || $usuario->tienePermiso('sucursales.todas')) {
            return;
        }

        $sucursalId = $usuario->getAttribute('sucursal_id');

        if ($sucursalId === null) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $sucursalId = (int) $sucursalId;

        if ($this->relacion === null) {
            $builder->where($model->qualifyColumn('sucursal_id'), $sucursalId);

            return;
        }

        $builder->whereHas($this->relacion, function (Builder $query) use ($sucursalId): void {
            $query->where($query->getModel()->qualifyColumn('sucursal_id'), $sucursalId);
        });
    }
}
