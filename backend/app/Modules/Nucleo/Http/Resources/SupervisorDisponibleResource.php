<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Usuario */
final class SupervisorDisponibleResource extends JsonResource
{
    /** @return array{id: int, nombre: string} */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->getKey(),
            'nombre' => trim($this->resource->getAttribute('nombre').' '.$this->resource->getAttribute('apellido')),
        ];
    }
}
