<?php

namespace App\Modules\Produccion\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class RecetaResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id, 'variante_id' => $this->variante_id, 'nombre' => $this->nombre,
            'descripcion' => $this->descripcion, 'instrucciones' => $this->instrucciones,
            'rendimiento' => $this->rendimiento, 'ingredientes' => $this->whenLoaded('ingredientes'),
        ];
    }
}
