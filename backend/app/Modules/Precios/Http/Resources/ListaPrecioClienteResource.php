<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Resources;

use App\Modules\Nucleo\Support\UlidPublico;
use App\Modules\Precios\Models\ListaPrecioCliente;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ListaPrecioCliente */
class ListaPrecioClienteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        // DAT-08: el cliente se publica por su ulid; Precios no depende de Crm (ARQ-03), se lee por tabla.
        return ['id' => (int) $this->getKey(), 'cliente_id' => (string) UlidPublico::deTabla('clientes', $this->resource->getAttribute('cliente_id'))];
    }
}
