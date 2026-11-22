<?php

namespace App\Modules\Devoluciones\Http\Resources;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Devolucion
 *
 * `items` solo viaja cuando se carga explicitamente (show()/store(), no
 * index() -- mismo criterio que VentaResource/ApartadoResource). `venta`
 * es la venta ORIGEN (siempre presente); `venta_sombra` solo existe si
 * tipo='cambio'. El signo de `diferencia` ya lo decide el backend
 * (negativo=reembolso, positivo=cobro adicional) -- el frontend solo lo
 * colorea, nunca lo recalcula.
 */
class DevolucionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            /** @var string|null */
            'folio' => $this->resource->getAttribute('folio'),
            'fecha' => $this->fecha,
            /** @var 'devolucion'|'cambio' */
            'tipo' => $this->tipo,
            'venta' => $this->whenLoaded(
                'venta',
                fn () => $this->venta ? [
                    'id' => (string) $this->venta->getAttribute('ulid'),
                    'folio' => $this->venta->getAttribute('folio') === null ? null : (string) $this->venta->getAttribute('folio'),
                    'cliente_nombre' => $this->venta->cliente?->nombre,
                ] : null,
            ),
            'venta_sombra_id' => UlidPublico::de($this->resource, 'ventaSombra'),
            'venta_sombra_folio' => $this->resource->getRelation('ventaSombra')?->getAttribute('folio'),
            'monto_devolucion' => DecimalApi::dinero($this->monto_devolucion),
            'monto_cambio' => DecimalApi::dinero($this->monto_cambio),
            'diferencia' => DecimalApi::dinero($this->diferencia),
            'motivo' => $this->motivo,
            /** @var 'efectivo'|'nota_credito' */
            'tipo_reembolso' => $this->tipo_reembolso,
            // Devoluciones es base y NotasCredito extensión (ARQ-03): sin relación, se lee el ulid por tabla.
            'nota_credito_id' => UlidPublico::deTabla('notas_credito', $this->nota_credito_id),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => (string) $item->getAttribute('ulid'),
                /** @var 'devuelto'|'nuevo' */
                'tipo' => $item->tipo,
                'variante_id' => $item->variante_id,
                'variante' => $item->variante ? [
                    'id' => $item->variante->id,
                    'nombre' => $item->variante->nombreDeAtributos(),
                    'producto_nombre' => $item->variante->producto?->nombre,
                ] : null,
                'cantidad' => DecimalApi::cantidad($item->cantidad),
                'precio_unitario' => DecimalApi::dinero($item->precio_unitario),
                'subtotal' => DecimalApi::dinero($item->subtotal),
                // DAT-03: la foto de la línea, nunca el catálogo actual.
                'descuento' => DecimalApi::dinero($item->getAttribute('descuento')),
                'lista_precio_nombre' => $item->getAttribute('lista_precio_nombre'),
                'regla_nombre' => $item->getAttribute('regla_nombre'),
                'tasa_impuesto' => DecimalApi::tasa((string) $item->getAttribute('tasa_impuesto')),
                'exento' => (bool) $item->getAttribute('exento'),
                'impuesto' => DecimalApi::dinero($item->getAttribute('impuesto')),
                'unidad_medida_id' => (int) $item->getAttribute('unidad_medida_id'),
                'va_a_merma' => $item->va_a_merma,
            ])),
            'pagos' => $this->whenLoaded('pagos', fn () => $this->pagos->map(fn ($pago) => [
                'metodo_pago_id' => $pago->metodo_pago_id,
                'nombre' => $pago->metodoPago?->nombre,
                'monto' => DecimalApi::dinero($pago->monto),
            ])),
        ];
    }
}
