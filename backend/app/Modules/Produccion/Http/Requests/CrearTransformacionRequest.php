<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Produccion\Dtos\CrearTransformacionDto;

class CrearTransformacionRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'variante_origen_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'variante_destino_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'cantidad_origen' => 'required|numeric|min:0.01',
            'cantidad_destino' => 'required|numeric|min:0.01',
            'notas' => 'nullable|string|max:1000',
        ];
    }

    public function toDto(): CrearTransformacionDto
    {
        $v = $this->validated();

        return new CrearTransformacionDto(
            varianteOrigenId: (int) $v['variante_origen_id'],
            varianteDestinoId: (int) $v['variante_destino_id'],
            cantidadOrigen: (float) $v['cantidad_origen'],
            cantidadDestino: (float) $v['cantidad_destino'],
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
        );
    }
}
