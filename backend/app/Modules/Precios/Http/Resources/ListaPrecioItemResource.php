<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Precios\Models\ListaPrecioItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ListaPrecioItem */
class ListaPrecioItemResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => (int) $this->getKey(), 'producto_id' => $this->resource->getAttribute('producto_id') === null ? null : (int) $this->resource->getAttribute('producto_id'), 'variante_id' => $this->resource->getAttribute('variante_id') === null ? null : (int) $this->resource->getAttribute('variante_id'), 'precio' => DecimalApi::dinero($this->resource->getAttribute('precio'))];
    }
}
