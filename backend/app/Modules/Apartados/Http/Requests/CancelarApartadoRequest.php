<?php

namespace App\Modules\Apartados\Http\Requests;

use App\Modules\Apartados\Dtos\CancelarApartadoDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class CancelarApartadoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'motivo' => ['required', 'string', 'max:255'],
        ];
    }

    public function toDto(): CancelarApartadoDto
    {
        return new CancelarApartadoDto(
            motivo: (string) $this->validated('motivo'),
        );
    }
}
