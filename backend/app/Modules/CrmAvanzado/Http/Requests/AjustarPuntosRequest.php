<?php

namespace App\Modules\CrmAvanzado\Http\Requests;

use App\Modules\CrmAvanzado\Dtos\AjustarPuntosDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class AjustarPuntosRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'puntos' => ['required', 'integer', 'min:-999999', 'max:999999'],
            'motivo' => ['required', 'string', 'max:500'],
        ];
    }

    public function toDto(): AjustarPuntosDto
    {
        $v = $this->validated();

        return new AjustarPuntosDto(
            puntos: (int) $v['puntos'],
            motivo: (string) $v['motivo'],
        );
    }
}
