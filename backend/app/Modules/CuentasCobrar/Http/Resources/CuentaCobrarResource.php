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
        $folioOrigen = $this->resource->getRelation('venta')?->getAttribute('folio');

        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            'folio' => $this->when(is_string($folioOrigen), fn () => (string) $folioOrigen),
            'venta_id' => UlidPublico::de($this->resource, 'venta'),
            'cliente' => $this->whenLoaded('cliente', fn () => [
                'id' => (string) UlidPublico::de($this->resource, 'cliente'),
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
