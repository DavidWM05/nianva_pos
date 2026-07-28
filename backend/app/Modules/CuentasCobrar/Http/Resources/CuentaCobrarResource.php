<?php

namespace App\Modules\CuentasCobrar\Http\Resources;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CuentaCobrar
 */
class CuentaCobrarResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'venta_id' => $this->venta_id,
            'cliente' => $this->whenLoaded('cliente', fn () => [
                'id' => $this->cliente->id,
                'nombre' => $this->cliente->nombre,
            ]),
            'monto_total' => $this->monto_total,
            'saldo_pendiente' => $this->saldo_pendiente,
            'fecha_vencimiento' => $this->fecha_vencimiento,
            'estado' => $this->estado,
            'dias_vencida' => $this->fecha_vencimiento
                ? max(0, now()->diffInDays($this->fecha_vencimiento, false))
                : 0,
            'abonos' => AbonoCuentaResource::collection($this->whenLoaded('abonos')),
            'created_at' => $this->created_at,
        ];
    }
}
