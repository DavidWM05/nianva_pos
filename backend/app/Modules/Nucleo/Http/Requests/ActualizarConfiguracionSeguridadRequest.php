<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ConfiguracionSeguridadDto;
use App\Modules\Nucleo\Models\ConfiguracionSeguridad;

class ActualizarConfiguracionSeguridadRequest extends SolicitudNegocio
{
    /**
     * Los clientes anteriores a SEG-06 no mandan minutos_inactividad; se
     * conserva el valor actual para que su edicion no falle.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('minutos_inactividad')) {
            return;
        }

        $minutos = ConfiguracionSeguridad::actual()?->getAttribute('minutos_inactividad');

        $this->merge([
            'minutos_inactividad' => is_numeric($minutos) ? (int) $minutos : 30,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'dias_dispositivo_normal' => ['required', 'integer', 'between:1,90'],
            'dias_dispositivo_admin' => ['required', 'integer', 'between:1,90'],
            'minutos_inactividad' => ['required', 'integer', 'between:5,480'],
        ];
    }

    public function toDto(): ConfiguracionSeguridadDto
    {
        $v = $this->validated();

        return new ConfiguracionSeguridadDto(
            diasDispositivoNormal: (int) $v['dias_dispositivo_normal'],
            diasDispositivoAdmin: (int) $v['dias_dispositivo_admin'],
            minutosInactividad: (int) $v['minutos_inactividad'],
        );
    }
}
