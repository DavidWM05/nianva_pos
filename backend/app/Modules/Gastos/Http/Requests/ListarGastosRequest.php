<?php

namespace App\Modules\Gastos\Http\Requests;

use App\Modules\Gastos\Dtos\ListarGastosDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\UlidPublico;
use App\Modules\Tpv\Support\ReglasCaja;

class ListarGastosRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // DAT-08: la sesión de caja llega por su ulid publicado; toDto() la traduce al id.
            'caja_sesion_id' => ['required', 'string', 'ulid', ReglasCaja::delTenantPorUlid($this->tenantId())],
        ];
    }

    public function toDto(): ListarGastosDto
    {
        return new ListarGastosDto(
            cajaSesionId: UlidPublico::idInterno('caja_sesiones', (string) $this->validated('caja_sesion_id')),
        );
    }
}
