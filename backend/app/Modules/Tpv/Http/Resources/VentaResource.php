<?php

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Tpv\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Venta
 *
 * `detalles` solo viaja cuando se carga explicitamente (show/store/anular
 * anular) -- index() no la carga a proposito, la lista no la necesita
 * (ver ReglaPrecioController para el mismo criterio de whenLoaded()).
 * `metodos_pago` es el resumen de venta_pagos ya con el nombre del
 * metodo resuelto -- evita que el frontend tenga que pedir el catalogo
 * de metodos_pago solo para poder mostrar la columna de la lista.
 */
class VentaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fecha' => $this->fecha,
            'cliente' => $this->whenLoaded(
                'cliente',
                fn () => $this->cliente ? ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre] : null,
            ),
            'total' => $this->total,
            'descuento_cupon' => $this->descuento_cupon,
            'descuento_manual' => $this->descuento_manual,
            'abono_previo' => $this->abono_previo,
            'estado' => $this->estado,
            'motivo_anulacion' => $this->motivo_anulacion,
            'fecha_anulacion' => $this->fecha_anulacion,
            'es_venta_sombra' => $this->es_venta_sombra,
            'metodos_pago' => $this->whenLoaded('pagos', fn () => $this->pagos->map(fn ($pago) => [
                'metodo_pago_id' => $pago->metodo_pago_id,
                'nombre' => $pago->metodoPago?->nombre,
                'monto' => $pago->monto,
            ])),
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
                'descuento_aplicado' => $detalle->descuento_aplicado,
                'subtotal' => $detalle->subtotal,
            ])),
        ];
    }
}
