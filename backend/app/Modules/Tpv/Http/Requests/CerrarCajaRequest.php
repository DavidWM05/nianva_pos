<?php

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Dtos\CerrarCajaDto;

class CerrarCajaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'monto_fisico' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function toDto(): CerrarCajaDto
    {
        return new CerrarCajaDto(
            montoFisico: (float) $this->validated('monto_fisico'),
        );
    }
}
