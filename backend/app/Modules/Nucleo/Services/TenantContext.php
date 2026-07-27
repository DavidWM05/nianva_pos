<?php

namespace App\Modules\Nucleo\Services;

use App\Modules\Nucleo\Models\Tenant;

/**
 * Unico punto de acceso al tenant activo de la request actual.
 *
 * Este es el "seam" de aislamiento: el resto de los modulos (Inventario, TPV, etc.)
 * deben resolver el tenant_id a traves de este servicio, nunca leyendo
 * Auth::user()->tenant_id directamente ni una variable global. Si en el futuro un
 * tenant grande necesita su propia base de datos, ese cambio se hace aqui (por
 * ejemplo, exponiendo tambien el nombre de conexion a usar) sin tocar los modulos
 * que ya dependen de esta clase.
 */
class TenantContext
{
    private ?Tenant $tenant = null;

    private bool $resuelto = false;

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
        $this->resuelto = true;
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?int
    {
        return $this->tenant?->id;
    }

    public function tieneTenant(): bool
    {
        return $this->tenant !== null;
    }

    /**
     * Si aun no ha corrido el middleware ResolveTenant para esta request
     * (por ejemplo, en un comando de consola o un job en cola).
     */
    public function resuelto(): bool
    {
        return $this->resuelto;
    }
}
