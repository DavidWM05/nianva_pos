<?php

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Dtos\AnularVentaDto;

class AnularVentaRequest extends SolicitudNegocio
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

    public function toDto(): AnularVentaDto
    {
        return new AnularVentaDto(
            motivo: (string) $this->validated('motivo'),
        );
    }
}
