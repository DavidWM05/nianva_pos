<?php

namespace App\Modules\VentasPlazos\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Models\PlanPagoClienteCuota;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin PlanPagoCliente */
class PlanPagoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $folioOrigen = $this->resource->getRelation('venta')?->getAttribute('folio');

        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            'folio' => $this->when(is_string($folioOrigen), fn () => (string) $folioOrigen),
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => (string) UlidPublico::de($this->resource, 'cliente'), 'nombre' => $this->cliente->nombre]),
            'venta_id' => UlidPublico::de($this->resource, 'venta'),
            'concepto' => $this->concepto,
            'monto_total' => DecimalApi::dinero($this->monto_total),
            'interes_total' => DecimalApi::dinero($this->interes_total),
            'tasa_interes' => $this->tasa_interes,
            'numero_cuotas' => $this->numero_cuotas,
            /** @var 'semanal'|'quincenal'|'mensual' */
            'periodicidad' => $this->periodicidad,
            'fecha_inicio' => $this->fecha_inicio,
            // Campos explicitos (ARQ-12b): el modelo crudo no documentaba el estado como enum.
            'cuotas' => $this->whenLoaded('cuotas', fn () => $this->cuotas->map(fn (PlanPagoClienteCuota $cuota) => [
                // DAT-08: ulid de la cuota; pagar-cuota la recibe en cuota_id.
                'id' => (string) $cuota->getAttribute('ulid'),
                'numero_cuota' => $cuota->numero_cuota,
                'monto' => DecimalApi::dinero($cuota->monto),
                'monto_capital' => DecimalApi::dinero($cuota->monto_capital),
                'monto_interes' => DecimalApi::dinero($cuota->monto_interes),
                'fecha_vencimiento' => $cuota->fecha_vencimiento,
                'fecha_pago' => $cuota->fecha_pago,
                /** @var 'pendiente'|'pagada'|'vencida' */
                'estado' => $cuota->estado,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
