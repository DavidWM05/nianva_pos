<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Http\FormRequest;

abstract class SolicitudNegocio extends FormRequest
{
    public function authorize(): bool
    {
        // El permiso lo revisa el middleware permiso:* de la ruta (SEG-03).
        return true;
    }

    abstract public function toDto(): object;

    protected function tenantId(): int
    {
        $tenantId = app(TenantContext::class)->id();

        if ($tenantId === null) {
            // Scramble genera la especificacion desde consola, donde no hay
            // request HTTP ni tenant; 0 no coincide con ningun tenant y permite
            // evaluar las reglas sin abortar. En HTTP se conserva el 500.
            if (app()->runningInConsole() && request()->route() === null) {
                return 0;
            }

            abort(500, 'No hay tenant activo.');
        }

        return $tenantId;
    }
}
