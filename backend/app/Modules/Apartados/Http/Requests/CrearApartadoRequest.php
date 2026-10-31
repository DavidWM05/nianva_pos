<?php

namespace App\Modules\Apartados\Http\Requests;

use App\Modules\Apartados\Dtos\CrearApartadoDto;
use App\Modules\Apartados\Dtos\LineaApartadoDto;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class CrearApartadoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'cliente_id' => ['required', 'integer', ReglasTenant::existe('clientes', $tenantId)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'fecha_vencimiento' => ['nullable', 'date'],
            'notas' => ['nullable', 'string'],
        ];
    }

    public function toDto(): CrearApartadoDto
    {
        $v = $this->validated();

        $items = array_values(array_map(
            function (mixed $item): LineaApartadoDto {
                $item = (array) $item;

                return new LineaApartadoDto(
                    varianteId: (int) $item['variante_id'],
                    cantidad: (int) $item['cantidad'],
                );
            },
            (array) ($v['items'] ?? []),
        ));

        return new CrearApartadoDto(
            clienteId: (int) $v['cliente_id'],
            items: $items,
            fechaVencimiento: isset($v['fecha_vencimiento']) ? (string) $v['fecha_vencimiento'] : null,
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
        );
    }
}
