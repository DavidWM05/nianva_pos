<?php

declare(strict_types=1);

namespace App\Modules\Cotizaciones\Http\Requests;

use App\Modules\Cotizaciones\Dtos\ActualizarCotizacionDto;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Support\ResolverPreciosCotizacion;
use App\Modules\Inventario\Support\ReglasCantidad;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Precios\Support\ContextoPrecio;
use Carbon\CarbonImmutable;

class ActualizarCotizacionRequest extends SolicitudNegocio
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
            'validez_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'descuento' => ['nullable', 'numeric', 'decimal:0,2', 'min:0'],
            'uso_cfdi' => ['nullable', 'string', 'max:10'],
            'observaciones' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', ...ReglasCantidad::paraVariante($tenantId)],
            'items.*.precio_unitario' => ['nullable', 'numeric', 'decimal:0,2', 'min:0'],
            'items.*.descuento' => ['nullable', 'numeric', 'decimal:0,2', 'min:0'],
        ];
    }

    public function toDto(): ActualizarCotizacionDto
    {
        $v = $this->validated();
        $actual = Cotizacion::query()->findOrFail((int) $this->route('id'));
        $clienteContexto = isset($v['cliente_id']) ? (int) $v['cliente_id'] : $actual->getAttribute('cliente_id');
        $listaContexto = array_key_exists('lista_precio_id', $v) ? ($v['lista_precio_id'] === null ? null : (int) $v['lista_precio_id']) : $actual->getAttribute('lista_precio_id');

        $usuario = $this->user();
        $sucursalContextoId = $usuario?->getAttribute('sucursal_id');
        $precioManual = $usuario instanceof Usuario
            && $usuario->tienePermiso('cotizaciones.precio_manual');

        $items = app(ResolverPreciosCotizacion::class)->resolver(
            (array) ($v['items'] ?? []),
            $precioManual,
            new ContextoPrecio((int) $this->tenantId(), $sucursalContextoId === null ? null : (int) $sucursalContextoId, $clienteContexto === null ? null : (int) $clienteContexto, CarbonImmutable::now(), $listaContexto === null ? null : (int) $listaContexto),
        );

        return new ActualizarCotizacionDto(
            listaPrecioId: isset($v['lista_precio_id']) ? (int) $v['lista_precio_id'] : null,
            clienteId: isset($v['cliente_id']) ? (int) $v['cliente_id'] : null,
            validezDias: isset($v['validez_dias']) ? (int) $v['validez_dias'] : null,
            descuento: isset($v['descuento']) ? (float) $v['descuento'] : null,
            usoCfdi: isset($v['uso_cfdi']) ? (string) $v['uso_cfdi'] : null,
            observaciones: isset($v['observaciones']) ? (string) $v['observaciones'] : null,
            items: $items,
            presentes: array_keys($v),
        );
    }

    public function messages(): array
    {
        return ReglasCantidad::mensajes(['items.*.cantidad']);
    }
}
