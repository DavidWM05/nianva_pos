<?php

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\LicenciaLocal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin LicenciaLocal
 */
class LicenciaLocalResource extends JsonResource
{
    /**
     * Estados "en funcionamiento" -- los unicos donde tiene sentido mostrar
     * un aviso de periodo de gracia si la ultima validacion esta vieja.
     * 'vencida'/'revocada' ya son el resultado final, no un aviso previo.
     */
    private const ESTADOS_EN_FUNCIONAMIENTO = ['activa', 'prueba'];

    public function toArray(Request $request): array
    {
        $diasDesdeUltimaValidacion = $this->ultima_validacion !== null
            ? (int) $this->ultima_validacion->diffInDays(now())
            : null;

        return [
            'estado' => $this->estado,
            'tipo' => $this->tipo,
            'fecha_expiracion' => $this->fecha_expiracion,
            'ultima_validacion' => $this->ultima_validacion,
            'dias_desde_ultima_validacion' => $diasDesdeUltimaValidacion,
            // Heuristica, no un campo propio: no hay un timestamp separado
            // de "ultimo intento" vs "ultima validacion exitosa" en
            // licencia_local, asi que esto solo puede inferirse comparando
            // ultima_validacion contra el intervalo de revalidacion
            // esperado (>=1 dia sin contacto exitoso, con el estado
            // todavia "en funcionamiento").
            'en_periodo_gracia' => in_array($this->estado, self::ESTADOS_EN_FUNCIONAMIENTO, true)
                && $diasDesdeUltimaValidacion !== null
                && $diasDesdeUltimaValidacion >= 1,
        ];
    }
}
