<?php

namespace App\Modules\Cotizaciones\Http\Resources;

use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CotizacionDetalle
 */
class CotizacionDetalleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'variante_id' => $this->variante_id,
            'variante' => $this->whenLoaded('variante', fn () => [
                'id' => $this->variante->id,
                'nombre' => $this->variante->producto?->nombre,
            ]),
            'cantidad' => $this->cantidad,
            'precio_unitario' => $this->precio_unitario,
            'descuento' => $this->descuento,
            'subtotal' => $this->subtotal,
        ];
    }
}
