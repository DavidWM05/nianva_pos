<?php

namespace App\Modules\Payroll\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NominaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'periodo_inicio' => $this->periodo_inicio,
            'periodo_fin' => $this->periodo_fin,
            'total_percepciones' => $this->total_percepciones,
            'total_deducciones' => $this->total_deducciones,
            'total_neto' => $this->total_neto,
            'estado' => $this->estado,
            'fecha_pago' => $this->fecha_pago,
            'detalles' => NominaDetalleResource::collection($this->whenLoaded('detalles')),
        ];
    }
}
