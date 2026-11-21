<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
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
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            // D-3, transitorio: número visible de la sesión (= id interno), solo para mostrarlo; lo
            // reemplaza el folio de DAT-07.
            'numero' => (int) $this->getKey(),
            'sucursal_id' => $this->sucursal_id,
            'usuario_id' => $this->usuario_id,
            'monto_apertura' => DecimalApi::dinero($this->monto_apertura),
            'total_teorico' => $this->getAttribute('total_teorico') === null ? null : DecimalApi::dinero($this->getAttribute('total_teorico')),
            'metodos' => $this->whenLoaded('cierreMetodos', fn () => CajaCierreMetodoResource::collection($this->cierreMetodos)),
            'monto_cierre' => $this->monto_cierre === null ? null : DecimalApi::dinero($this->monto_cierre),
            'total_ventas_sistema' => $this->total_ventas_sistema === null ? null : DecimalApi::dinero($this->total_ventas_sistema),
            'diferencia' => $this->diferencia === null ? null : DecimalApi::dinero($this->diferencia),
            'fecha_apertura' => $this->fecha_apertura,
            'fecha_cierre' => $this->fecha_cierre,
            /** @var 'abierta'|'cerrada' */
            'estado' => $this->estado,
        ];
    }
}
