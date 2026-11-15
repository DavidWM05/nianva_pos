<?php

namespace App\Modules\Delivery\Http\Resources;

use App\Modules\Delivery\Models\PedidoItem;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PedidoItem */
class PedidoItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'variante_id' => $this->variante_id,
            'cantidad' => DecimalApi::cantidad($this->cantidad),
            'precio_unitario' => DecimalApi::dinero($this->precio_unitario),
            'subtotal' => DecimalApi::dinero($this->subtotal),
        ];
    }
}
