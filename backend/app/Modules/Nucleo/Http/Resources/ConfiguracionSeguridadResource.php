<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ConfiguracionSeguridad
 */
class ConfiguracionSeguridadResource extends JsonResource
{
    /**
     * El contrato de este endpoint ya devuelve los campos en la raiz.
     */
    public static $wrap = null;

    /**
     * @return array{dias_dispositivo_normal: int, dias_dispositivo_admin: int, minutos_inactividad: int}
     */
    public function toArray(Request $request): array
    {
        $configuracion = $this->resource;

        return [
            'dias_dispositivo_normal' => (int) $configuracion->getAttribute('dias_dispositivo_normal'),
            'dias_dispositivo_admin' => (int) $configuracion->getAttribute('dias_dispositivo_admin'),
            'minutos_inactividad' => (int) $configuracion->getAttribute('minutos_inactividad'),
        ];
    }
}
