<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\UlidPublico;
use App\Modules\Precios\Dtos\AsignarListaPrecioClienteDto;

class AsignarListaPrecioClienteRequest extends SolicitudNegocio
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['cliente_id' => ['required', 'string', 'ulid', ReglasTenant::existeUlid('clientes', $this->tenantId())]];
    }

    public function toDto(): AsignarListaPrecioClienteDto
    {
        return new AsignarListaPrecioClienteDto(UlidPublico::idInterno('clientes', (string) $this->validated('cliente_id')));
    }
}
