<?php

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;

class CrearVentaRequest extends SolicitudNegocio
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
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.metodo_pago_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $tenantId)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'cupon_codigo' => ['nullable', 'string'],
            'descuento_manual' => ['nullable', 'numeric', 'min:0'],
            'gift_card_codigo' => ['nullable', 'string', 'max:50'],
            'nota_credito_id' => ['nullable', 'integer', ReglasTenant::existe('notas_credito', $tenantId)],
        ];
    }

    public function toDto(): CrearVentaDto
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

        $pagos = array_values(array_map(
            function (mixed $pago): PagoDto {
                $pago = (array) $pago;

                return new PagoDto(
                    metodoPagoId: (int) $pago['metodo_pago_id'],
                    monto: (float) $pago['monto'],
                );
            },
            (array) ($v['pagos'] ?? []),
        ));

        return new CrearVentaDto(
            clienteId: (int) $v['cliente_id'],
            items: $items,
            pagos: $pagos,
            cuponCodigo: isset($v['cupon_codigo']) ? (string) $v['cupon_codigo'] : null,
            descuentoManual: round((float) ($v['descuento_manual'] ?? 0), 2),
            giftCardCodigo: isset($v['gift_card_codigo']) ? (string) $v['gift_card_codigo'] : null,
            notaCreditoId: isset($v['nota_credito_id']) ? (int) $v['nota_credito_id'] : null,
        );
    }
}
