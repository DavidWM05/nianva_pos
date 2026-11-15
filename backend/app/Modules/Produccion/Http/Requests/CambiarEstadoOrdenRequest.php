<?php

namespace App\Modules\Produccion\Http\Requests;

use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Produccion\Dtos\CambiarEstadoOrdenDto;
use App\Modules\Produccion\Models\OrdenProduccion;

class CambiarEstadoOrdenRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $orden = OrdenProduccion::query()->with('receta')->where('tenant_id', $this->tenantId())->whereKey($this->route('id'))->first();
        $varianteId = $orden?->receta?->getAttribute('variante_id');

        return [
            'estado' => 'required|string|in:pendiente,en_proceso,completada,cancelada',
            'cantidad_producida' => ['required_if:estado,completada', ...ReglasCantidad::paraVariante($this->tenantId(), varianteId: $varianteId === null ? null : (int) $varianteId)],
        ];
    }

    public function toDto(): CambiarEstadoOrdenDto
    {
        $v = $this->validated();

        return new CambiarEstadoOrdenDto(
            estado: (string) $v['estado'],
            cantidadProducida: isset($v['cantidad_producida']) ? Cantidad::numero($v['cantidad_producida']) : null,
        );
    }

    public function messages(): array
    {
        return ReglasCantidad::mensajes(['cantidad_producida']);
    }
}
