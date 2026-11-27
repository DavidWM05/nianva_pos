<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CajaSesion */
final class CajaRemotaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->resource->getAttribute('ulid'),
            'terminal' => (string) $this->terminal?->getAttribute('nombre'),
            'fecha_operativa' => (string) $this->resource->getAttribute('fecha_operativa'),
            'metodos' => MetodoCajaRemotaResource::collection($this->saldos),
        ];
    }
}
