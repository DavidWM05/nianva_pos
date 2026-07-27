<?php

namespace App\Modules\Apartados\Http\Resources;

use App\Modules\Apartados\Models\Apartado;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Apartado
 *
 * `detalles`/`abonos` solo viajan cuando se cargan explicitamente (show(),
 * no index()) -- mismo criterio que VentaResource. El saldo pendiente
 * (total - total_abonado) no se manda calculado: es resta simple, el
 * frontend la hace igual que ya hace con el resto de los totales -- no es
 * "logica de precios" que deba resolver el backend (a diferencia del
 * precio de una linea, que si viene siempre de PrecioService).
 */
class ApartadoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fecha_creacion' => $this->fecha_creacion,
            'cliente' => $this->whenLoaded(
                'cliente',
                fn () => $this->cliente ? ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre] : null,
            ),
            'total' => $this->total,
            'total_abonado' => $this->total_abonado,
            'estado' => $this->estado,
            'fecha_vencimiento' => $this->fecha_vencimiento,
            'fecha_completado' => $this->fecha_completado,
            'fecha_cancelado' => $this->fecha_cancelado,
            'motivo_cancelacion' => $this->motivo_cancelacion,
            'venta_id' => $this->venta_id,
            'notas' => $this->notas,
            'detalles' => $this->whenLoaded('detalles', fn () => $this->detalles->map(fn ($detalle) => [
                'id' => $detalle->id,
                'variante_id' => $detalle->variante_id,
                'variante' => $detalle->variante ? [
                    'id' => $detalle->variante->id,
                    'talla' => $detalle->variante->talla,
                    'color' => $detalle->variante->color,
                    'producto_nombre' => $detalle->variante->producto?->nombre,
                ] : null,
                'cantidad' => $detalle->cantidad,
                'precio_unitario' => $detalle->precio_unitario,
                'subtotal' => $detalle->subtotal,
            ])),
            'abonos' => $this->whenLoaded('abonos', fn () => $this->abonos->map(fn ($abono) => [
                'id' => $abono->id,
                'monto' => $abono->monto,
                'fecha' => $abono->fecha,
                'notas' => $abono->notas,
                'pagos' => $abono->pagos->map(fn ($pago) => [
                    'metodo_pago_id' => $pago->metodo_pago_id,
                    'nombre' => $pago->metodoPago?->nombre,
                    'monto' => $pago->monto,
                ]),
            ])),
        ];
    }
}
