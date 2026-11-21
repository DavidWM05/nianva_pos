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
        return [
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            // D-3, transitorio: número visible de la nota (= id interno), solo para mostrarlo; lo
            // reemplaza el folio de DAT-07.
            'numero' => (int) $this->getKey(),
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => (string) UlidPublico::de($this->resource, 'cliente'), 'nombre' => $this->cliente->nombre]),
            'devolucion_id' => UlidPublico::de($this->resource, 'devolucion'),
            // D-3, transitorio: número visible de la devolución de origen (= id interno), solo para
            // mostrarlo; lo reemplaza el folio de DAT-07.
            'devolucion_numero' => $this->resource->getAttribute('devolucion_id') === null ? null : (int) $this->resource->getAttribute('devolucion_id'),
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
                    // D-3, transitorio: el número de la venta, para mostrarla.
                    'numero' => (int) $uso->venta->getKey(),
                    /** @var string */
                    'fecha' => $uso->venta->getAttribute('fecha'),
                    'total' => DecimalApi::dinero((string) $uso->venta->getAttribute('total')),
                ] : null,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
