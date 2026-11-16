<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Resources;

use App\Modules\Precios\Models\ListaPrecio;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ListaPrecio */
class ListaPrecioResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => (int) $this->getKey(), 'nombre' => (string) $this->resource->getAttribute('nombre'), 'activo' => (bool) $this->resource->getAttribute('activo'),
            'items' => ListaPrecioItemResource::collection($this->whenLoaded('items')),
            'clientes' => ListaPrecioClienteResource::collection($this->whenLoaded('clientes'))];
    }
}
