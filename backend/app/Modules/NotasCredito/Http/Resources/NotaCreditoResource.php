<?php

namespace App\Modules\NotasCredito\Http\Resources;

use App\Modules\NotasCredito\Models\NotaCredito;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NotaCredito */
class NotaCreditoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre]),
            'devolucion_id' => $this->devolucion_id,
            'monto_original' => $this->monto_original,
            'saldo_disponible' => $this->saldo_disponible,
            'fecha_expiracion' => $this->fecha_expiracion,
            'estado' => $this->estado,
            'usos' => $this->whenLoaded('usos'),
            'created_at' => $this->created_at,
        ];
    }
}
