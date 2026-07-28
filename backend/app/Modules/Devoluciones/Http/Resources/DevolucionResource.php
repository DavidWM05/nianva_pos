<?php

namespace App\Modules\Devoluciones\Http\Resources;

use App\Modules\Devoluciones\Models\Devolucion;
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
            'id' => $this->id,
            'fecha' => $this->fecha,
            'tipo' => $this->tipo,
            'venta' => $this->whenLoaded(
                'venta',
                fn () => $this->venta ? [
                    'id' => $this->venta->id,
                    'cliente_nombre' => $this->venta->cliente?->nombre,
                ] : null,
            ),
            'venta_sombra_id' => $this->venta_sombra_id,
            'monto_devolucion' => $this->monto_devolucion,
            'monto_cambio' => $this->monto_cambio,
            'diferencia' => $this->diferencia,
            'motivo' => $this->motivo,
            'tipo_reembolso' => $this->tipo_reembolso,
            'nota_credito_id' => $this->nota_credito_id,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'tipo' => $item->tipo,
                'variante_id' => $item->variante_id,
                'variante' => $item->variante ? [
                    'id' => $item->variante->id,
                    'talla' => $item->variante->talla,
                    'color' => $item->variante->color,
                    'producto_nombre' => $item->variante->producto?->nombre,
                ] : null,
                'cantidad' => $item->cantidad,
                'precio_unitario' => $item->precio_unitario,
                'subtotal' => $item->subtotal,
                'va_a_merma' => $item->va_a_merma,
            ])),
            'pagos' => $this->whenLoaded('pagos', fn () => $this->pagos->map(fn ($pago) => [
                'metodo_pago_id' => $pago->metodo_pago_id,
                'nombre' => $pago->metodoPago?->nombre,
                'monto' => $pago->monto,
            ])),
        ];
    }
}
