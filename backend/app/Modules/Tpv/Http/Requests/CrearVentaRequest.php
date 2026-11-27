<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Support\PresentacionDeVariante;
use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Services\Planes;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\UlidPublico;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use Illuminate\Validation\Rule;

class CrearVentaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'lista_precio_id' => ['nullable', 'integer', ReglasTenant::existe('listas_precio', $tenantId)->where('activo', true)],
            'cliente_id' => [Rule::requiredIf(fn (): bool => app(Planes::class)->deTenant($tenantId)->incluye('clientes')), 'nullable', 'string', 'ulid', ReglasTenant::existeUlid('clientes', $tenantId)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.presentacion_id' => ['nullable', 'integer', new PresentacionDeVariante($tenantId)],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', ...ReglasCantidad::paraVariante($tenantId)],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.metodo_pago_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $tenantId)],
            'pagos.*.monto' => ['required', 'numeric', 'decimal:0,2', 'min:0.01'],
            'cupon_codigo' => ['nullable', 'string'],
            'descuento_manual' => ['nullable', 'numeric', 'decimal:0,2', 'min:0'],
            'gift_card_codigo' => ['nullable', 'string', 'max:50'],
            // DAT-08: la nota llega por su ulid publicado; toDto() la traduce al id.
            'nota_credito_id' => ['nullable', 'string', 'ulid', ReglasTenant::existeUlid('notas_credito', $tenantId)],
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
                    presentacionId: isset($item['presentacion_id']) ? (int) $item['presentacion_id'] : null,
                    cantidad: Cantidad::numero($item['cantidad']),
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
            listaPrecioId: isset($v['lista_precio_id']) ? (int) $v['lista_precio_id'] : null,
            clienteId: isset($v['cliente_id']) ? UlidPublico::idInterno('clientes', (string) $v['cliente_id'])
                : (int) Cliente::query()->where('es_sistema', true)->firstOrFail()->getKey(),
            items: $items,
            pagos: $pagos,
            cuponCodigo: isset($v['cupon_codigo']) ? (string) $v['cupon_codigo'] : null,
            descuentoManual: round((float) ($v['descuento_manual'] ?? 0), 2),
            giftCardCodigo: isset($v['gift_card_codigo']) ? (string) $v['gift_card_codigo'] : null,
            notaCreditoId: isset($v['nota_credito_id']) ? UlidPublico::idInterno('notas_credito', (string) $v['nota_credito_id']) : null,
        );
    }

    public function messages(): array
    {
        return ReglasCantidad::mensajes(['items.*.cantidad']);
    }
}
