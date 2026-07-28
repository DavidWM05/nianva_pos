<?php

namespace App\Modules\CuentasPagar\Http\Resources;

use App\Modules\CuentasPagar\Models\AbonoPagar;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AbonoPagar
 */
class AbonoPagarResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'monto' => $this->monto,
            'metodo_pago' => $this->whenLoaded('metodoPago', fn () => $this->metodoPago->nombre),
            'referencia' => $this->referencia,
            'fecha' => $this->fecha,
        ];
    }
}
