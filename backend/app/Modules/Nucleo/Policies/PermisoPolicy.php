<?php

namespace App\Modules\Nucleo\Policies;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Usuario;

class PermisoPolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('permisos.ver');
    }

    public function view(Usuario $usuario, Permiso $permiso): bool
    {
        return $usuario->tienePermiso('permisos.ver');
    }

    // El catalogo de permisos es global (sin tenant_id): solo el superadmin lo gestiona,
    // vía tienePermiso() que siempre es true para él.
    public function create(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('permisos.crear');
    }

    public function update(Usuario $usuario, Permiso $permiso): bool
    {
        return $usuario->tienePermiso('permisos.editar');
    }

    public function delete(Usuario $usuario, Permiso $permiso): bool
    {
        return $usuario->tienePermiso('permisos.eliminar');
    }
}
