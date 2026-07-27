<?php

namespace App\Modules\Nucleo\Policies;

use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Policies\Concerns\PerteneceAlTenant;

class UsuarioPolicy
{
    use PerteneceAlTenant;

    public function viewAny(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('usuarios.ver');
    }

    public function view(Usuario $usuario, Usuario $modelo): bool
    {
        return $usuario->is($modelo)
            || ($usuario->tienePermiso('usuarios.ver') && $this->perteneceAlTenant($usuario, $modelo));
    }

    public function create(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('usuarios.crear');
    }

    public function update(Usuario $usuario, Usuario $modelo): bool
    {
        return $usuario->is($modelo)
            || ($usuario->tienePermiso('usuarios.editar') && $this->perteneceAlTenant($usuario, $modelo));
    }

    public function delete(Usuario $usuario, Usuario $modelo): bool
    {
        return ! $usuario->is($modelo)
            && $usuario->tienePermiso('usuarios.eliminar')
            && $this->perteneceAlTenant($usuario, $modelo);
    }
}
