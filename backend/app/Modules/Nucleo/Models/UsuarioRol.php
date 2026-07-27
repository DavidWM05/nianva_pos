<?php

namespace App\Modules\Nucleo\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UsuarioRol extends Pivot
{
    protected $table = 'usuario_roles';

    public $incrementing = false;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'sucursal_id' => 'integer',
        ];
    }

    /**
     * AsPivot delega getUpdatedAtColumn() al modelo padre de la relacion
     * (Usuario), no a esta clase, e incluso reactiva $timestamps si el
     * registro trae 'created_at'. Se sobreescribe explicitamente para que
     * la tabla (que no tiene updated_at) nunca reciba esa columna.
     */
    public function getUpdatedAtColumn(): ?string
    {
        return null;
    }
}
