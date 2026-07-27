<?php

namespace App\Modules\Nucleo\Policies;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Policies\Concerns\PerteneceAlTenant;

class SucursalPolicy
{
    use PerteneceAlTenant;

    public function viewAny(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('sucursales.ver');
    }

    public function view(Usuario $usuario, Sucursal $sucursal): bool
    {
        return $usuario->tienePermiso('sucursales.ver') && $this->perteneceAlTenant($usuario, $sucursal);
    }

    public function create(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('sucursales.crear');
    }

    public function update(Usuario $usuario, Sucursal $sucursal): bool
    {
        return $usuario->tienePermiso('sucursales.editar') && $this->perteneceAlTenant($usuario, $sucursal);
    }

    public function delete(Usuario $usuario, Sucursal $sucursal): bool
    {
        return $usuario->tienePermiso('sucursales.eliminar') && $this->perteneceAlTenant($usuario, $sucursal);
    }
}
