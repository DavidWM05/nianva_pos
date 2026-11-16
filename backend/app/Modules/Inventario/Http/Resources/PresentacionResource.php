<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Resources;

use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Presentacion */
class PresentacionResource extends JsonResource
{
    /** @return array<string,mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => (int) $this->resource->getKey(), 'variante_id' => (int) $this->resource->getAttribute('variante_id'), 'nombre' => (string) $this->resource->getAttribute('nombre'), 'factor' => DecimalApi::cantidad($this->resource->getAttribute('factor')), 'codigo_barras' => $this->resource->getAttribute('codigo_barras') === null ? null : (string) $this->resource->getAttribute('codigo_barras'), 'precio_venta' => $this->resource->getAttribute('precio_venta') === null ? null : DecimalApi::dinero($this->resource->getAttribute('precio_venta'))];
    }
}
