<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Dtos\CodigoVentaDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CodigoVentaDto */
class CodigoVentaResource extends JsonResource
{
    /** @return array<string,mixed> */
    public function toArray(Request $request): array
    {
        return ['variante_id' => $this->resource->varianteId, 'producto_nombre' => $this->resource->productoNombre, 'presentacion_id' => $this->resource->presentacionId, 'presentacion_nombre' => $this->resource->presentacionNombre, 'factor' => DecimalApi::cantidad($this->resource->factor), 'stock_actual' => DecimalApi::cantidad($this->resource->stockActual)];
    }
}
