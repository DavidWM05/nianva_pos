<?php

namespace App\Modules\Produccion\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Produccion\Models\TransformacionProducto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TransformacionProducto */
class TransformacionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // DAT-08: el identificador público es el ulid.
            'id' => (string) $this->resource->getAttribute('ulid'),
            'variante_origen_id' => $this->variante_origen_id,
            'variante_destino_id' => $this->variante_destino_id,
            'cantidad_origen' => DecimalApi::cantidad($this->cantidad_origen),
            'cantidad_destino' => DecimalApi::cantidad($this->cantidad_destino),
            'notas' => $this->notas,
            'created_at' => $this->created_at,
        ];
    }
}
