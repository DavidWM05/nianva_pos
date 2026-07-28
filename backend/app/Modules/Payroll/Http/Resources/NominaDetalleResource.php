<?php

namespace App\Modules\Payroll\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NominaDetalleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empleado' => $this->whenLoaded('empleado', fn () => [
                'id' => $this->empleado->id,
                'usuario' => $this->empleado->usuario ? [
                    'id' => $this->empleado->usuario->id,
                    'nombre' => $this->empleado->usuario->nombre,
                ] : null,
            ]),
            'dias_trabajados' => $this->dias_trabajados,
            'percepciones' => $this->percepciones,
            'deducciones' => $this->deducciones,
            'neto' => $this->neto,
        ];
    }
}
