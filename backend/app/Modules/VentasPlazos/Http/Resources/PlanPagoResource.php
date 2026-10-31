<?php

namespace App\Modules\VentasPlazos\Http\Resources;

use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PlanPagoCliente */
class PlanPagoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre]),
            'venta_id' => $this->venta_id,
            'concepto' => $this->concepto,
            'monto_total' => $this->monto_total,
            'interes_total' => $this->interes_total,
            'tasa_interes' => $this->tasa_interes,
            'numero_cuotas' => $this->numero_cuotas,
            'periodicidad' => $this->periodicidad,
            'fecha_inicio' => $this->fecha_inicio,
            'cuotas' => $this->whenLoaded('cuotas'),
            'created_at' => $this->created_at,
        ];
    }
}
