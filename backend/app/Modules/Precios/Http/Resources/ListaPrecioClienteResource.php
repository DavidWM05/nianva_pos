<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Resources;

use App\Modules\Precios\Models\ListaPrecioCliente;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ListaPrecioCliente */
class ListaPrecioClienteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return ['id' => (int) $this->getKey(), 'cliente_id' => (int) $this->resource->getAttribute('cliente_id')];
    }
}
