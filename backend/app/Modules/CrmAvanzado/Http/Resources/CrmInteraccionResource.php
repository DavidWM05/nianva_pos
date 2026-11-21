<?php

namespace App\Modules\CrmAvanzado\Http\Resources;

use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CrmInteraccion */
class CrmInteraccionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // DAT-08 (D-10, cambio mínimo en módulo congelado): el cliente se publica por su ulid.
            'cliente_id' => UlidPublico::de($this->resource, 'cliente'),
            'usuario' => $this->whenLoaded('usuario', fn () => ['id' => $this->usuario->id, 'nombre' => $this->usuario->nombre]),
            /** @var 'llamada'|'email'|'whatsapp'|'nota'|'visita' */
            'tipo' => $this->tipo,
            'observacion' => $this->observacion,
            'fecha' => $this->fecha,
        ];
    }
}
