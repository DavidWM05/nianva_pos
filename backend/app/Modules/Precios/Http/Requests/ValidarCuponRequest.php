<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Precios\Dtos\ValidarCuponDto;

class ValidarCuponRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'codigo' => ['required', 'string'],
            'total' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function toDto(): ValidarCuponDto
    {
        $v = $this->validated();
        $sucursalId = $this->user()?->getAttribute('sucursal_id');

        return new ValidarCuponDto(
            codigo: (string) $v['codigo'],
            total: (float) $v['total'],
            sucursalId: $sucursalId === null ? null : (int) $sucursalId,
        );
    }
}
