<?php

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Precios\Dtos\ValidarCuponDto;

class ValidarCuponRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'codigo' => ['required', 'string'],
            'total' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function toDto(): ValidarCuponDto
    {
        $v = $this->validated();

        return new ValidarCuponDto(
            codigo: (string) $v['codigo'],
            total: (float) $v['total'],
        );
    }
}
