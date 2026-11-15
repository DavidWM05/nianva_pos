<?php

namespace App\Modules\Payroll\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
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
            'total_percepciones' => DecimalApi::dinero($this->total_percepciones),
            'total_deducciones' => DecimalApi::dinero($this->total_deducciones),
            'total_neto' => DecimalApi::dinero($this->total_neto),
            /** @var 'calculada'|'pagada'|'cancelada' */
            'estado' => $this->estado,
            'fecha_pago' => $this->fecha_pago,
            'detalles' => NominaDetalleResource::collection($this->whenLoaded('detalles')),
        ];
    }
}
