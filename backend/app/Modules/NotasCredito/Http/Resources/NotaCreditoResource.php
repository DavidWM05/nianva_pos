<?php

namespace App\Modules\NotasCredito\Http\Resources;

use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NotaCredito */
class NotaCreditoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $folioOrigen = $this->resource->getRelation('devolucion')?->getAttribute('folio');

        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            'folio' => $this->when(is_string($folioOrigen), fn () => (string) $folioOrigen),
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => (string) UlidPublico::de($this->resource, 'cliente'), 'nombre' => $this->cliente->nombre]),
            'devolucion_id' => UlidPublico::de($this->resource, 'devolucion'),
            'monto_original' => DecimalApi::dinero($this->monto_original),
            'saldo_disponible' => DecimalApi::dinero($this->saldo_disponible),
            'fecha_expiracion' => $this->fecha_expiracion,
            /** @var 'activa'|'usada_parcial'|'usada_total'|'expirada'|'cancelada' */
            'estado' => $this->estado,
            // Campos explicitos (ARQ-12b): el modelo crudo no documentaba la venta que carga show().
            'usos' => $this->whenLoaded('usos', fn () => $this->usos->map(fn (NotaCreditoUso $uso) => [
                'id' => (string) $uso->getAttribute('ulid'),
                'venta_id' => UlidPublico::de($uso, 'venta'),
                'monto_usado' => DecimalApi::dinero($uso->monto_usado),
                'created_at' => $uso->created_at,
                'venta' => $uso->relationLoaded('venta') && $uso->venta !== null ? [
                    'id' => (string) $uso->venta->getAttribute('ulid'),
                    /** @var string|null */
                    'folio' => $uso->venta->getAttribute('folio'),
                    /** @var string */
                    'fecha' => $uso->venta->getAttribute('fecha'),
                    'total' => DecimalApi::dinero((string) $uso->venta->getAttribute('total')),
                ] : null,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
