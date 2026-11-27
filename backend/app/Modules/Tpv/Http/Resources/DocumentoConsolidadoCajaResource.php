<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\CajaConsolidado;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CajaConsolidado */
final class DocumentoConsolidadoCajaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->resource->getAttribute('ulid'),
            'original_id' => $this->original === null ? null : (string) $this->original->getAttribute('ulid'),
            'supervisor_apertura' => $this->supervisorApertura === null ? null : (string) $this->supervisorApertura->getAttribute('nombre'),
            'fecha_cierre' => (string) $this->resource->getAttribute('fecha_cierre')->toAtomString(),
            'total_contado' => DecimalApi::dinero($this->resource->getAttribute('total_contado')),
            'total_teorico' => DecimalApi::dinero($this->resource->getAttribute('total_teorico')),
            'diferencia' => DecimalApi::dinero($this->resource->getAttribute('diferencia')),
            'cortes' => CorteConsolidadoCajaResource::collection($this->cortes),
        ];
    }
}
