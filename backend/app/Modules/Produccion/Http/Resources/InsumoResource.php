<?php

namespace App\Modules\Produccion\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Resources\Json\JsonResource;

class InsumoResource extends JsonResource
{
    public function toArray($request): array
    {
        return ['id' => $this->id, 'nombre' => $this->nombre, 'sku' => $this->sku, 'unidad_medida_id' => $this->unidad_medida_id, 'costo' => DecimalApi::costoUnitario($this->costo), 'stock_minimo' => $this->stock_minimo === null ? null : DecimalApi::cantidad($this->stock_minimo), 'activo' => $this->activo];
    }
}
