<?php

namespace App\Modules\Cotizaciones\Http\Requests;

use App\Modules\Cotizaciones\Dtos\CrearCotizacionDto;
use App\Modules\Cotizaciones\Support\ResolverPreciosCotizacion;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\SucursalOperacion;

class CrearCotizacionRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'cliente_id' => ['nullable', 'integer', ReglasTenant::existe('clientes', $tenantId)],
            'sucursal_id' => ['nullable', 'integer', ReglasTenant::existe('sucursales', $tenantId)],
            'validez_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'uso_cfdi' => ['nullable', 'string', 'max:10'],
            'observaciones' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['nullable', 'numeric', 'min:0'],
            'items.*.descuento' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function toDto(): CrearCotizacionDto
    {
        $v = $this->validated();
        $usuario = $this->user();

        if ($usuario === null) {
            abort(401);
        }

        $precioManual = $usuario->tienePermiso('cotizaciones.precio_manual');

        $items = app(ResolverPreciosCotizacion::class)->resolver(
            (array) ($v['items'] ?? []),
            $precioManual,
        );

        return new CrearCotizacionDto(
            clienteId: isset($v['cliente_id']) ? (int) $v['cliente_id'] : null,
            sucursalId: SucursalOperacion::paraEscritura(
                $usuario,
                isset($v['sucursal_id']) ? (int) $v['sucursal_id'] : null,
            ),
            validezDias: (int) ($v['validez_dias'] ?? 15),
            descuento: (float) ($v['descuento'] ?? 0),
            usoCfdi: isset($v['uso_cfdi']) ? (string) $v['uso_cfdi'] : null,
            observaciones: isset($v['observaciones']) ? (string) $v['observaciones'] : null,
            items: $items,
        );
    }
}
