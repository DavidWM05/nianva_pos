<?php

namespace App\Modules\Gastos\Http\Requests;

use App\Modules\Gastos\Dtos\ListarGastosDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Support\ReglasCaja;

class ListarGastosRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'caja_sesion_id' => ['required', 'integer', ReglasCaja::delTenant($this->tenantId())],
        ];
    }

    public function toDto(): ListarGastosDto
    {
        return new ListarGastosDto(
            cajaSesionId: (int) $this->validated('caja_sesion_id'),
        );
    }
}
