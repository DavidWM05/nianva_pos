<?php

namespace App\Modules\CuentasPagar\Http\Resources;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CuentaPagar
 */
class CuentaPagarResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $folioOrigen = $this->resource->getRelation('compra')?->getAttribute('folio');

        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            'folio' => $this->when(is_string($folioOrigen), fn () => (string) $folioOrigen),
            'compra_id' => UlidPublico::de($this->resource, 'compra'),
            'proveedor' => $this->whenLoaded('proveedor', fn () => [
                'id' => $this->proveedor->id,
                'razon_social' => $this->proveedor->razon_social,
            ]),
            'monto_total' => DecimalApi::dinero($this->monto_total),
            'saldo_pendiente' => DecimalApi::dinero($this->saldo_pendiente),
            'fecha_vencimiento' => $this->fecha_vencimiento,
            /** @var 'pendiente'|'pagada'|'anulada' */
            'estado' => $this->estado,
            'abonos' => AbonoPagarResource::collection($this->whenLoaded('abonos')),
            'created_at' => $this->created_at,
        ];
    }
}
