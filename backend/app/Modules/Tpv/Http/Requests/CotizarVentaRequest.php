<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\ReglasTenant;
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
            'lista_precio_id' => ['nullable', 'integer', ReglasTenant::existe('listas_precio', $tenantId)->where('activo', true)],
            'cliente_id' => ['nullable', 'integer', ReglasTenant::existe('clientes', $tenantId)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', ...ReglasCantidad::paraVariante($tenantId)],
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
                    cantidad: Cantidad::numero($item['cantidad']),
                );
            },
            (array) ($v['items'] ?? []),
        ));

        return new CotizarVentaDto(items: $items, clienteId: isset($v['cliente_id']) ? (int) $v['cliente_id'] : null, listaPrecioId: isset($v['lista_precio_id']) ? (int) $v['lista_precio_id'] : null);
    }

    public function messages(): array
    {
        return ReglasCantidad::mensajes(['items.*.cantidad']);
    }
}
