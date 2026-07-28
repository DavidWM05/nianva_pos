<?php

namespace App\Modules\CrmAvanzado\Http\Resources;

use App\Modules\CrmAvanzado\Models\CrmCampana;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CrmCampana */
class CrmCampanaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'usuario' => $this->whenLoaded('usuario', fn () => ['id' => $this->usuario->id, 'nombre' => $this->usuario->nombre]),
            'asunto' => $this->asunto,
            'segmento' => $this->segmento,
            'destinatarios' => $this->destinatarios,
            'enviado_en' => $this->enviado_en,
            'created_at' => $this->created_at,
        ];
    }
}
