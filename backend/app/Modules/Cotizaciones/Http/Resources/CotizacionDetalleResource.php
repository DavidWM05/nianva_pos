<?php

namespace App\Modules\Cotizaciones\Http\Resources;

use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Nucleo\Support\DecimalApi;
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
            'id' => (string) $this->resource->getAttribute('ulid'),
            'variante_id' => $this->variante_id,
            'variante' => $this->whenLoaded('variante', fn () => [
                'id' => $this->variante->id,
                'nombre' => $this->variante->producto?->nombre,
            ]),
            'cantidad' => DecimalApi::cantidad($this->cantidad),
            'precio_unitario' => DecimalApi::dinero($this->precio_unitario),
            'descuento' => DecimalApi::dinero($this->descuento),
            'subtotal' => DecimalApi::dinero($this->subtotal),
            // DAT-03: la foto de la línea, nunca el catálogo actual.
            'lista_precio_nombre' => $this->lista_precio_nombre,
            'regla_nombre' => $this->regla_nombre,
            'tasa_impuesto' => DecimalApi::tasa((string) $this->tasa_impuesto),
            'exento' => (bool) $this->exento,
            'impuesto' => DecimalApi::dinero($this->impuesto),
            'unidad_medida_id' => (int) $this->unidad_medida_id,
        ];
    }
}
