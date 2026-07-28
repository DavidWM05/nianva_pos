<?php

namespace App\Modules\CrmAvanzado\Http\Resources;

use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CrmInteraccion */
class CrmInteraccionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cliente_id' => $this->cliente_id,
            'usuario' => $this->whenLoaded('usuario', fn () => ['id' => $this->usuario->id, 'nombre' => $this->usuario->nombre]),
            'tipo' => $this->tipo,
            'observacion' => $this->observacion,
            'fecha' => $this->fecha,
        ];
    }
}
