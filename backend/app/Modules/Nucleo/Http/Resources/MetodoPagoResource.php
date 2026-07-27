<?php

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\MetodoPago;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MetodoPago
 */
class MetodoPagoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'tipo' => $this->tipo,
            'incluir_en_financiero' => $this->incluir_en_financiero,
            'activo' => $this->activo,
            // El frontend usa esto para bloquear editar/desactivar en las
            // filas del catalogo global sembrado (Efectivo/Tarjeta/
            // Transferencia) -- ver MetodoPagoController::rechazarSiEsGlobal().
            'es_global' => $this->tenant_id === null,
        ];
    }
}
