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
            abort(500, 'No hay tenant activo.');
        }

        return $tenantId;
    }
}
