<?php

namespace App\Modules\Payroll\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmpleadoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'usuario_id' => $this->usuario_id,
            'usuario' => $this->whenLoaded('usuario', fn () => [
                'id' => $this->usuario->id,
                'nombre' => $this->usuario->nombre,
            ]),
            'sucursal_id' => $this->sucursal_id,
            'salario_base' => $this->salario_base,
            'tipo_salario' => $this->tipo_salario,
            'numero_seguridad_social' => $this->numero_seguridad_social,
            'fecha_ingreso' => $this->fecha_ingreso,
            'activo' => $this->activo,
        ];
    }
}
