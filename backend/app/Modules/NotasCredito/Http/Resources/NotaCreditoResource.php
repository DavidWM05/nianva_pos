<?php

namespace App\Modules\NotasCredito\Http\Resources;

use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NotaCredito */
class NotaCreditoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre]),
            'devolucion_id' => $this->devolucion_id,
            'monto_original' => DecimalApi::dinero($this->monto_original),
            'saldo_disponible' => DecimalApi::dinero($this->saldo_disponible),
            'fecha_expiracion' => $this->fecha_expiracion,
            /** @var 'activa'|'usada_parcial'|'usada_total'|'expirada'|'cancelada' */
            'estado' => $this->estado,
            // Campos explicitos (ARQ-12b): el modelo crudo no documentaba la venta que carga show().
            'usos' => $this->whenLoaded('usos', fn () => $this->usos->map(fn (NotaCreditoUso $uso) => [
                'id' => $uso->id,
                'venta_id' => $uso->venta_id,
                'monto_usado' => DecimalApi::dinero($uso->monto_usado),
                'created_at' => $uso->created_at,
                'venta' => $uso->relationLoaded('venta') && $uso->venta !== null ? [
                    'id' => (int) $uso->venta->getKey(),
                    /** @var string */
                    'fecha' => $uso->venta->getAttribute('fecha'),
                    'total' => DecimalApi::dinero((string) $uso->venta->getAttribute('total')),
                ] : null,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
