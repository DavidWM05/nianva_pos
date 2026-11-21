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
        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            // D-3, transitorio: número visible de la cuenta (= id interno), solo para mostrarlo; lo
            // reemplaza el folio de DAT-07.
            'numero' => (int) $this->getKey(),
            'compra_id' => UlidPublico::de($this->resource, 'compra'),
            // D-3, transitorio: número visible de la compra de origen.
            'compra_numero' => $this->resource->getAttribute('compra_id') === null ? null : (int) $this->resource->getAttribute('compra_id'),
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
