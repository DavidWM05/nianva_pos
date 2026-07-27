<?php

namespace App\Modules\Gastos\Http\Resources;

use App\Modules\Gastos\Models\Gasto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Gasto
 */
class GastoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'descripcion' => $this->descripcion,
            'monto' => $this->monto,
            'fecha' => $this->fecha,
        ];
    }
}
