<?php

namespace App\Modules\Gastos\Http\Resources;

use App\Modules\Gastos\Models\Gasto;
use App\Modules\Nucleo\Support\DecimalApi;
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
            'monto' => DecimalApi::dinero($this->monto),
            'fecha' => $this->fecha,
        ];
    }
}
