<?php

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Services\EstadoLicenciaPos;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use Psr\Clock\ClockInterface;

/** @property LicenciaLocal $resource */
class LicenciaLocalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $licencia = $this->resource;
        $estado = app(EstadoLicenciaPos::class);
        $motivo = $estado->motivo($licencia);
        $confirmada = $licencia->getAttribute('ultima_validacion');
        $ahora = app(ClockInterface::class)->now();

        return [
            /** @var 'activa'|'vencida'|'revocada'|'prueba' */
            'estado' => $motivo === 'gracia_agotada' ? 'vencida' : $licencia->getAttribute('estado'),
            /** @var 'saas'|'pago_unico'|'anual'|'demo' */
            'tipo' => $licencia->getAttribute('tipo'),
            /** @var Carbon|null */
            'fecha_expiracion' => $licencia->getAttribute('fecha_expiracion'),
            /** @var Carbon|null */
            'ultima_validacion' => $confirmada,
            /** @var Carbon|null */
            'ultimo_contacto' => $licencia->getAttribute('ultimo_contacto'),
            'soporte_hasta' => $estado->verificar($licencia)['soporte_hasta'] ?? null,
            'modo_operativo' => $motivo === null ? 'operativa' : 'solo_lectura',
            /** @var string|null */
            'motivo' => $motivo,
            'dias_desde_ultima_validacion' => $confirmada === null ? null : (int) $confirmada->diffInDays($ahora),
            // En anual y demo, la gracia dura hasta siete días desde la última
            // confirmación o el vencimiento firmado, lo que ocurra primero.
            // Se señala ante vencimiento o tras un día sin confirmación.
            /** @var bool */
            'en_periodo_gracia' => $estado->enGracia($licencia),
        ];
    }
}
