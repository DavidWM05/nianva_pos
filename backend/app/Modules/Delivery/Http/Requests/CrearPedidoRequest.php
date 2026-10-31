<?php

namespace App\Modules\Delivery\Http\Requests;

use App\Modules\Delivery\Dtos\CrearPedidoDto;
use App\Modules\Delivery\Dtos\LineaPedidoDto;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\SucursalOperacion;

class CrearPedidoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'cliente_id' => ['required', 'integer', ReglasTenant::existe('clientes', $tenantId)],
            'sucursal_id' => ['nullable', 'integer', ReglasTenant::existe('sucursales', $tenantId)],
            'direccion_entrega' => ['nullable', 'string', 'max:500'],
            'referencia' => ['nullable', 'string', 'max:255'],
            'costo_delivery' => ['nullable', 'numeric', 'min:0'],
            'tiempo_estimado' => ['nullable', 'integer', 'min:1'],
            'notas' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.variante_id' => ['required_with:items', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required_with:items', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['required_with:items', 'numeric', 'min:0'],
        ];
    }

    public function toDto(): CrearPedidoDto
    {
        $v = $this->validated();
        $usuario = $this->user();

        if ($usuario === null) {
            abort(401);
        }

        $items = array_values(array_map(
            function (mixed $item): LineaPedidoDto {
                $item = (array) $item;

                return new LineaPedidoDto(
                    varianteId: (int) $item['variante_id'],
                    cantidad: (int) $item['cantidad'],
                    precioUnitario: (float) $item['precio_unitario'],
                );
            },
            (array) ($v['items'] ?? []),
        ));

        return new CrearPedidoDto(
            clienteId: (int) $v['cliente_id'],
            sucursalId: SucursalOperacion::paraEscritura(
                $usuario,
                isset($v['sucursal_id']) ? (int) $v['sucursal_id'] : null,
            ),
            direccionEntrega: isset($v['direccion_entrega']) ? (string) $v['direccion_entrega'] : null,
            referencia: isset($v['referencia']) ? (string) $v['referencia'] : null,
            costoDelivery: isset($v['costo_delivery']) ? (float) $v['costo_delivery'] : null,
            tiempoEstimado: isset($v['tiempo_estimado']) ? (int) $v['tiempo_estimado'] : null,
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
            items: $items,
        );
    }
}
