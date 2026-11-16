<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Precios\Dtos\AsignarListaPrecioClienteDto;

class AsignarListaPrecioClienteRequest extends SolicitudNegocio
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['cliente_id' => ['required', 'integer', ReglasTenant::existe('clientes', $this->tenantId())]];
    }

    public function toDto(): AsignarListaPrecioClienteDto
    {
        return new AsignarListaPrecioClienteDto((int) $this->validated('cliente_id'));
    }
}
