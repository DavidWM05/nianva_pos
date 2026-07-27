<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Policies\PermisoPolicy;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['modulo', 'accion', 'nombre', 'descripcion'])]
#[UsePolicy(PermisoPolicy::class)]
class Permiso extends Model
{
    const UPDATED_AT = null;

    protected $table = 'permisos';

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'rol_permisos')
            ->using(RolPermiso::class)
            ->withPivot('created_at');
    }
}
