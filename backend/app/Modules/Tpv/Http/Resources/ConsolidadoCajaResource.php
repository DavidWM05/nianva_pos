<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Http\Resources\DatosImpreso;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\CajaConsolidado;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property-read array{fecha_operativa: string, sucursal: Sucursal, documentos: Collection<int, CajaConsolidado>, total_teorico: string, total_contado: string, diferencia: string} $resource */
final class ConsolidadoCajaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $original = $this->resource['documentos']->first();
        $impreso = DatosImpreso::de($this->resource['sucursal'], null, $original?->getAttribute('ulid'), $original?->getAttribute('fecha_cierre'));

        return [
            /** @var array{empresa: string, rfc: ?string, telefono: ?string, sucursal: string, folio: ?string, fecha: ?string, usuario: ?string} */
            'encabezado' => $impreso['encabezado'],
            'fecha_operativa' => (string) $this->resource['fecha_operativa'],
            'documentos' => DocumentoConsolidadoCajaResource::collection($this->resource['documentos']),
            'total_teorico' => DecimalApi::dinero($this->resource['total_teorico']),
            'total_contado' => DecimalApi::dinero($this->resource['total_contado']),
            'diferencia' => DecimalApi::dinero($this->resource['diferencia']),
        ];
    }
}
