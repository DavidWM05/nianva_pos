<?php

namespace App\Modules\Produccion\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Produccion\Models\OrdenProduccion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin OrdenProduccion */
class OrdenProduccionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            // D-3, transitorio: número visible de la orden (= id interno); lo reemplaza el folio de DAT-07.
            'numero' => (int) $this->getKey(),
            'receta' => $this->whenLoaded('receta', fn () => ['id' => $this->receta->id, 'nombre' => $this->receta->nombre]),
            'cantidad_programada' => DecimalApi::cantidad($this->cantidad_programada),
            'cantidad_producida' => $this->cantidad_producida === null ? null : DecimalApi::cantidad($this->cantidad_producida),
            /** @var 'pendiente'|'en_proceso'|'completada'|'cancelada' */
            'estado' => $this->estado,
            'notas' => $this->notas,
            'fecha_programada' => $this->fecha_programada,
            'fecha_completada' => $this->fecha_completada,
            'created_at' => $this->created_at,
        ];
    }
}
