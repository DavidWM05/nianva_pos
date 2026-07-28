<?php

namespace App\Modules\Produccion\Http\Resources;

use App\Modules\Produccion\Models\OrdenProduccion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin OrdenProduccion */
class OrdenProduccionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receta' => $this->whenLoaded('receta', fn () => ['id' => $this->receta->id, 'nombre' => $this->receta->nombre]),
            'cantidad_programada' => $this->cantidad_programada,
            'cantidad_producida' => $this->cantidad_producida,
            'estado' => $this->estado,
            'notas' => $this->notas,
            'fecha_programada' => $this->fecha_programada,
            'fecha_completada' => $this->fecha_completada,
            'created_at' => $this->created_at,
        ];
    }
}
