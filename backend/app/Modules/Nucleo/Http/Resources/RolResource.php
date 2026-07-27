<?php

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\Rol;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Rol
 */
class RolResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'es_sistema' => $this->es_sistema,
            'usuarios_count' => $this->whenCounted('usuarios'),
            'permisos' => $this->whenLoaded('permisos', fn () => $this->permisos->pluck('id')),
        ];
    }
}
