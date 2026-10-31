<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Database\Factories\PermisoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['modulo', 'accion', 'nombre', 'descripcion'])]
class Permiso extends Model
{
    /** @use HasFactory<PermisoFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'permisos';

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'rol_permisos')
            ->using(RolPermiso::class)
            ->withPivot('created_at');
    }
}
