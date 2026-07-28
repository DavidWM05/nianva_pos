<?php

namespace App\Modules\CuentasCobrar\Http\Resources;

use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AbonoCuenta
 */
class AbonoCuentaResource extends JsonResource
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
