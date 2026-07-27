<?php

namespace App\Modules\Nucleo\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class RolPermiso extends Pivot
{
    protected $table = 'rol_permisos';

    public $incrementing = false;

    public $timestamps = false;

    /**
     * AsPivot delega getUpdatedAtColumn() al modelo padre de la relacion
     * (Rol/Permiso), no a esta clase, e incluso reactiva $timestamps si el
     * registro trae 'created_at'. Se sobreescribe explicitamente para que
     * la tabla (que no tiene updated_at) nunca reciba esa columna.
     */
    public function getUpdatedAtColumn(): ?string
    {
        return null;
    }
}
