<?php

namespace App\Modules\Crm\Http\Resources;

use App\Modules\Crm\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cliente
 */
class ClienteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // DAT-08 (D-2): el cliente nace en la terminal; su identificador público es el ulid.
            'id' => (string) $this->resource->getAttribute('ulid'),
            'nombre' => $this->nombre,
            'documento_fiscal' => $this->documento_fiscal,
            'telefono' => $this->telefono,
            'correo' => $this->correo,
            'direccion' => $this->direccion,
            'activo' => $this->activo,
            'es_sistema' => $this->es_sistema,
            'fecha_registro' => $this->fecha_registro,
        ];
    }
}
