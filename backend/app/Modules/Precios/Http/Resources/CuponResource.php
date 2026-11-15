<?php

namespace App\Modules\Precios\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Precios\Models\Cupon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cupon
 */
class CuponResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'codigo' => $this->codigo,
            'nombre' => $this->nombre,
            'tipo' => $this->tipo,
            'valor' => DecimalApi::dinero($this->valor),
            'uso_maximo' => $this->uso_maximo,
            'uso_maximo_por_cliente' => $this->uso_maximo_por_cliente,
            'fecha_inicio' => $this->fecha_inicio,
            'fecha_fin' => $this->fecha_fin,
            'activo' => $this->activo,
        ];
    }
}
