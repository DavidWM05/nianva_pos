<?php

namespace App\Modules\Nucleo\Policies;

use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;

class TenantPolicy
{
    public function viewAny(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('tenants.ver');
    }

    public function view(Usuario $usuario, Tenant $tenant): bool
    {
        return $usuario->tienePermiso('tenants.ver')
            && ($usuario->esSuperadmin() || $usuario->tenant_id === $tenant->id);
    }

    public function create(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('tenants.crear');
    }

    public function update(Usuario $usuario, Tenant $tenant): bool
    {
        return $usuario->tienePermiso('tenants.editar')
            && ($usuario->esSuperadmin() || $usuario->tenant_id === $tenant->id);
    }

    public function delete(Usuario $usuario, Tenant $tenant): bool
    {
        return $usuario->tienePermiso('tenants.eliminar')
            && ($usuario->esSuperadmin() || $usuario->tenant_id === $tenant->id);
    }
}
