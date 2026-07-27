<?php

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CajaSesion
 */
class CajaSesionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sucursal_id' => $this->sucursal_id,
            'usuario_id' => $this->usuario_id,
            'monto_apertura' => $this->monto_apertura,
            'monto_cierre' => $this->monto_cierre,
            'total_ventas_sistema' => $this->total_ventas_sistema,
            'diferencia' => $this->diferencia,
            'fecha_apertura' => $this->fecha_apertura,
            'fecha_cierre' => $this->fecha_cierre,
            'estado' => $this->estado,
        ];
    }
}
