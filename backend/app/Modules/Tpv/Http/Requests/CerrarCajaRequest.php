<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Tpv\Dtos\CerrarCajaDto;

class CerrarCajaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'conteos' => ['required', 'array', 'min:1'],
            'conteos.*.metodo_pago_id' => ['required', 'integer', 'distinct', ReglasTenant::existeGlobalODelTenant('metodos_pago', $this->tenantId())],
            'conteos.*.monto' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
        ];
    }

    public function toDto(): CerrarCajaDto
    {
        return new CerrarCajaDto(
            conteos: $this->validated('conteos'),
        );
    }
}
