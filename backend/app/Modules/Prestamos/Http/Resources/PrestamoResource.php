<?php

namespace App\Modules\Prestamos\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class PrestamoResource extends JsonResource
{
    public function toArray($request): array
    {
        return ['id' => $this->id, 'proveedor_id' => $this->proveedor_id, 'referencia' => $this->referencia, 'monto' => $this->monto, 'interes' => $this->interes, 'monto_a_pagar' => $this->monto_a_pagar, 'saldo_pendiente' => $this->saldo_pendiente, 'fecha_prestamo' => $this->fecha_prestamo, 'fecha_vencimiento' => $this->fecha_vencimiento, 'estado' => $this->estado, 'notas' => $this->notas, 'pagos' => $this->whenLoaded('pagos')];
    }
}
