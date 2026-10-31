<?php

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Dtos\AbrirCajaDto;

class AbrirCajaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'monto_apertura' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function toDto(): AbrirCajaDto
    {
        return new AbrirCajaDto(
            montoApertura: (float) $this->validated('monto_apertura'),
        );
    }
}
