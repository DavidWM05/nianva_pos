<?php

namespace App\Modules\Delivery\Http\Requests;

use App\Modules\Delivery\Dtos\AsignarRepartidorDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class AsignarRepartidorRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'repartidor_id' => ['required', 'integer', ReglasTenant::existe('usuarios', $this->tenantId())],
        ];
    }

    public function toDto(): AsignarRepartidorDto
    {
        return new AsignarRepartidorDto(
            repartidorId: (int) $this->validated('repartidor_id'),
        );
    }
}
