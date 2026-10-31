<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Produccion\Dtos\CambiarEstadoOrdenDto;

class CambiarEstadoOrdenRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'estado' => 'required|string|in:pendiente,en_proceso,completada,cancelada',
            'cantidad_producida' => 'required_if:estado,completada|integer|min:1',
        ];
    }

    public function toDto(): CambiarEstadoOrdenDto
    {
        $v = $this->validated();

        return new CambiarEstadoOrdenDto(
            estado: (string) $v['estado'],
            cantidadProducida: isset($v['cantidad_producida']) ? (int) $v['cantidad_producida'] : null,
        );
    }
}
