<?php

namespace App\Modules\CuentasPagar\Http\Resources;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CuentaPagar
 */
class CuentaPagarResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'compra_id' => $this->compra_id,
            'proveedor' => $this->whenLoaded('proveedor', fn () => [
                'id' => $this->proveedor->id,
                'razon_social' => $this->proveedor->razon_social,
            ]),
            'monto_total' => DecimalApi::dinero($this->monto_total),
            'saldo_pendiente' => DecimalApi::dinero($this->saldo_pendiente),
            'fecha_vencimiento' => $this->fecha_vencimiento,
            /** @var 'pendiente'|'pagada'|'anulada' */
            'estado' => $this->estado,
            'abonos' => AbonoPagarResource::collection($this->whenLoaded('abonos')),
            'created_at' => $this->created_at,
        ];
    }
}
