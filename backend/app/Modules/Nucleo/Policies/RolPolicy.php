<?php

namespace App\Modules\Nucleo\Policies;

use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;

class RolPolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('roles.ver');
    }

    public function view(Usuario $usuario, Rol $rol): bool
    {
        // roles de sistema (tenant_id NULL) son visibles para cualquiera con el permiso,
        // se usan para asignarlos a usuarios de cualquier tenant.
        return $usuario->tienePermiso('roles.ver')
            && ($rol->tenant_id === null || $usuario->esSuperadmin() || $usuario->tenant_id === $rol->tenant_id);
    }

    public function create(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('roles.crear');
    }

    public function update(Usuario $usuario, Rol $rol): bool
    {
        // los roles de sistema solo los edita el superadmin, nunca un admin de tenant.
        if ($rol->tenant_id === null) {
            return $usuario->esSuperadmin();
        }

        return $usuario->tienePermiso('roles.editar') && $usuario->tenant_id === $rol->tenant_id;
    }

    public function delete(Usuario $usuario, Rol $rol): bool
    {
        if ($rol->tenant_id === null) {
            return $usuario->esSuperadmin();
        }

        return $usuario->tienePermiso('roles.eliminar') && $usuario->tenant_id === $rol->tenant_id;
    }
}
