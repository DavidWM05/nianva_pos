<?php

namespace App\Modules\Delivery\Http\Requests;

use App\Modules\Delivery\Dtos\CambiarEstadoPedidoDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class CambiarEstadoPedidoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'estado' => ['required', 'string', 'in:pendiente,preparando,en_camino,entregado,cancelado'],
        ];
    }

    public function toDto(): CambiarEstadoPedidoDto
    {
        return new CambiarEstadoPedidoDto(
            estado: (string) $this->validated('estado'),
        );
    }
}
