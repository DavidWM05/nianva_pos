<?php

namespace App\Modules\Nucleo\Policies\Concerns;

use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Model;

trait PerteneceAlTenant
{
    /**
     * Un superadmin (tenant_id NULL) siempre pertenece; el resto solo si
     * el registro es de su propio tenant (o es un recurso global, tenant_id NULL).
     */
    protected function perteneceAlTenant(Usuario $usuario, Model $modelo): bool
    {
        if ($usuario->esSuperadmin()) {
            return true;
        }

        return $modelo->tenant_id === null || $modelo->tenant_id === $usuario->tenant_id;
    }
}
