<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\Terminal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property Terminal $resource */
final class TerminalResource extends JsonResource
{
    /** @return array{id: int, sucursal_id: int, nombre: string} */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->resource->id,
            'sucursal_id' => $this->resource->sucursal_id,
            'nombre' => $this->resource->nombre,
        ];
    }
}
