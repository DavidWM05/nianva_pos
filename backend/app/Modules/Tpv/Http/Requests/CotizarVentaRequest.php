<?php

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Dtos\CotizarVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;

class CotizarVentaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
        ];
    }

    public function toDto(): CotizarVentaDto
    {
        $v = $this->validated();

        $items = array_values(array_map(
            function (mixed $item): LineaVentaDto {
                $item = (array) $item;

                return new LineaVentaDto(
                    varianteId: (int) $item['variante_id'],
                    cantidad: (int) $item['cantidad'],
                );
            },
            (array) ($v['items'] ?? []),
        ));

        return new CotizarVentaDto(items: $items);
    }
}
