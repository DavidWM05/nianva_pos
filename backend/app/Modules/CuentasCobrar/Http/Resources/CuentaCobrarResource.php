<?php

namespace App\Modules\CuentasCobrar\Http\Resources;

use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CuentaCobrar
 */
class CuentaCobrarResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'venta_id' => UlidPublico::de($this->resource, 'venta'),
            'cliente' => $this->whenLoaded('cliente', fn () => [
                'id' => $this->cliente->id,
                'nombre' => $this->cliente->nombre,
            ]),
            'monto_total' => DecimalApi::dinero($this->monto_total),
            'saldo_pendiente' => DecimalApi::dinero($this->saldo_pendiente),
            'fecha_vencimiento' => $this->fecha_vencimiento,
            /** @var 'pendiente'|'pagada'|'anulada' */
            'estado' => $this->estado,
            /** @var int */
            'dias_vencida' => $this->fecha_vencimiento
                ? max(0, now()->diffInDays($this->fecha_vencimiento, false))
                : 0,
            'abonos' => AbonoCuentaResource::collection($this->whenLoaded('abonos')),
            'created_at' => $this->created_at,
        ];
    }
}
