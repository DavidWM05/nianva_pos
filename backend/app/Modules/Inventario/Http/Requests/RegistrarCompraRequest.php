<?php

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class RegistrarCompraRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'proveedor_id' => ['required', 'integer', ReglasTenant::existe('proveedores', $tenantId)],
            'numero_comprobante' => ['nullable', 'string', 'max:60'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_compra' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function toDto(): CompraDto
    {
        $v = $this->validated();

        $items = array_values(array_map(
            function (mixed $item): LineaCompraDto {
                $item = (array) $item;

                return new LineaCompraDto(
                    varianteId: (int) $item['variante_id'],
                    cantidad: (int) $item['cantidad'],
                    precioCompra: (float) $item['precio_compra'],
                );
            },
            (array) ($v['items'] ?? []),
        ));

        return new CompraDto(
            proveedorId: (int) $v['proveedor_id'],
            numeroComprobante: isset($v['numero_comprobante']) ? (string) $v['numero_comprobante'] : null,
            items: $items,
        );
    }
}
