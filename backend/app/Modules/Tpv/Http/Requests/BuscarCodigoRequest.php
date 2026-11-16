<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Dtos\BuscarCodigoDto;

class BuscarCodigoRequest extends SolicitudNegocio
{
    /** @return array<string,mixed> */
    public function rules(): array
    {
        return ['codigo' => ['required', 'string', 'max:50']];
    }

    public function toDto(): BuscarCodigoDto
    {
        $v = $this->validated();
        $s = $this->user()?->getAttribute('sucursal_id');

        return new BuscarCodigoDto((string) $v['codigo'], $this->tenantId(), $s === null ? null : (int) $s);
    }
}
