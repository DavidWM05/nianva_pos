<?php

namespace App\Modules\Nucleo\Policies;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Policies\Concerns\PerteneceAlTenant;

class MetodoPagoPolicy
{
    use PerteneceAlTenant;

    public function viewAny(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('metodos_pago.ver');
    }

    public function view(Usuario $usuario, MetodoPago $metodoPago): bool
    {
        return $usuario->tienePermiso('metodos_pago.ver') && $this->perteneceAlTenant($usuario, $metodoPago);
    }

    public function create(Usuario $usuario): bool
    {
        return $usuario->tienePermiso('metodos_pago.crear');
    }

    public function update(Usuario $usuario, MetodoPago $metodoPago): bool
    {
        return $usuario->tienePermiso('metodos_pago.editar') && $this->perteneceAlTenant($usuario, $metodoPago);
    }

    public function delete(Usuario $usuario, MetodoPago $metodoPago): bool
    {
        return $usuario->tienePermiso('metodos_pago.eliminar') && $this->perteneceAlTenant($usuario, $metodoPago);
    }
}
