<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ConfiguracionSeguridadDto;

class ActualizarConfiguracionSeguridadRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'dias_dispositivo_normal' => ['required', 'integer', 'between:1,90'],
            'dias_dispositivo_admin' => ['required', 'integer', 'between:1,90'],
        ];
    }

    public function toDto(): ConfiguracionSeguridadDto
    {
        $v = $this->validated();

        return new ConfiguracionSeguridadDto(
            diasDispositivoNormal: (int) $v['dias_dispositivo_normal'],
            diasDispositivoAdmin: (int) $v['dias_dispositivo_admin'],
        );
    }
}
