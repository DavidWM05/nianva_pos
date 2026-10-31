<?php

namespace App\Modules\Devoluciones\Http\Requests;

use App\Modules\Devoluciones\Dtos\CrearDevolucionDto;
use App\Modules\Devoluciones\Dtos\ItemDevueltoDto;
use App\Modules\Devoluciones\Dtos\ItemNuevoDto;
use App\Modules\Devoluciones\Dtos\PagoDevolucionDto;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use Illuminate\Validation\Rule;

class CrearDevolucionRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'venta_id' => ['required', 'integer', ReglasTenant::existe('ventas', $tenantId)],
            'tipo' => ['required', Rule::in(['devolucion', 'cambio'])],
            'items_devueltos' => ['required', 'array', 'min:1'],
            'items_devueltos.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items_devueltos.*.cantidad' => ['required', 'integer', 'min:1'],
            'items_devueltos.*.va_a_merma' => ['nullable', 'boolean'],
            'items_nuevos' => ['nullable', 'array', 'required_if:tipo,cambio', 'prohibited_if:tipo,devolucion', 'min:1'],
            'items_nuevos.*.variante_id' => ['required_with:items_nuevos', 'integer', ReglasVariante::delTenant($tenantId)],
            'items_nuevos.*.cantidad' => ['required_with:items_nuevos', 'integer', 'min:1'],
            'pagos' => ['nullable', 'array'],
            'pagos.*.metodo_pago_id' => ['required_with:pagos', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $tenantId)],
            'pagos.*.monto' => ['required_with:pagos', 'numeric', 'min:0.01'],
            'motivo' => ['nullable', 'string', 'max:255'],
            'tipo_reembolso' => ['nullable', Rule::in(['efectivo', 'nota_credito'])],
        ];
    }

    public function toDto(): CrearDevolucionDto
    {
        $v = $this->validated();

        $itemsDevueltos = array_values(array_map(
            function (mixed $item): ItemDevueltoDto {
                $item = (array) $item;

                return new ItemDevueltoDto(
                    varianteId: (int) $item['variante_id'],
                    cantidad: (int) $item['cantidad'],
                    vaAMerma: (bool) ($item['va_a_merma'] ?? false),
                );
            },
            (array) ($v['items_devueltos'] ?? []),
        ));

        $itemsNuevos = array_values(array_map(
            function (mixed $item): ItemNuevoDto {
                $item = (array) $item;

                return new ItemNuevoDto(
                    varianteId: (int) $item['variante_id'],
                    cantidad: (int) $item['cantidad'],
                );
            },
            (array) ($v['items_nuevos'] ?? []),
        ));

        $pagos = array_values(array_map(
            function (mixed $pago): PagoDevolucionDto {
                $pago = (array) $pago;

                return new PagoDevolucionDto(
                    metodoPagoId: (int) $pago['metodo_pago_id'],
                    monto: (float) $pago['monto'],
                );
            },
            (array) ($v['pagos'] ?? []),
        ));

        return new CrearDevolucionDto(
            ventaId: (int) $v['venta_id'],
            tipo: (string) $v['tipo'],
            itemsDevueltos: $itemsDevueltos,
            itemsNuevos: $itemsNuevos,
            pagos: $pagos,
            motivo: isset($v['motivo']) ? (string) $v['motivo'] : null,
            tipoReembolso: (string) ($v['tipo_reembolso'] ?? 'efectivo'),
        );
    }
}
