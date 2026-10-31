<?php

namespace App\Modules\Auditoria\Http\Requests;

use App\Modules\Auditoria\Dtos\AuditoriaRegistroDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class ListarAuditoriaRegistroRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tabla' => ['required', 'string'],
            'registro_id' => ['required', 'integer'],
        ];
    }

    public function toDto(): AuditoriaRegistroDto
    {
        $v = $this->validated();

        return new AuditoriaRegistroDto(
            tabla: (string) $v['tabla'],
            registroId: (int) $v['registro_id'],
        );
    }
}
