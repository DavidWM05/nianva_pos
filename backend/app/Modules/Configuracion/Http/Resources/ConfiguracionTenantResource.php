<?php

namespace App\Modules\Configuracion\Http\Resources;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ConfiguracionTenant
 */
class ConfiguracionTenantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'moneda' => $this->moneda,
            'mensaje_ticket' => $this->mensaje_ticket,
            'logo_url' => $this->logo_url,
            'mostrar_rfc' => $this->mostrar_rfc,
            'mostrar_telefono' => $this->mostrar_telefono,
            'mostrar_correo' => $this->mostrar_correo,
            'backup_auto' => $this->backup_auto,
            'backup_frecuencia' => $this->backup_frecuencia,
            'backup_ultimo' => $this->backup_ultimo,
            'codigo_barras_automatico' => $this->codigo_barras_automatico,
        ];
    }
}
