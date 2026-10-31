<?php

namespace App\Modules\Gastos\Http\Requests;

use App\Modules\Gastos\Dtos\CrearGastoDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class CrearGastoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'descripcion' => ['required', 'string', 'max:255'],
            'monto' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function toDto(): CrearGastoDto
    {
        $v = $this->validated();

        return new CrearGastoDto(
            descripcion: (string) $v['descripcion'],
            monto: (float) $v['monto'],
        );
    }
}
