<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CajaSesion */
final class CorteConsolidadoCajaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->resource->getAttribute('ulid'),
            'folio' => (string) $this->resource->getAttribute('folio'),
            'terminal' => (string) $this->terminal?->getAttribute('nombre'),
            'monto_contado' => DecimalApi::dinero($this->resource->getAttribute('monto_cierre')),
            'total_teorico' => DecimalApi::dinero($this->resource->getAttribute('total_teorico')),
            'diferencia' => DecimalApi::dinero($this->resource->getAttribute('diferencia')),
        ];
    }
}
