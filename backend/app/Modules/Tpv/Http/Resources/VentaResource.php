<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Venta
 *
 * `detalles` solo viaja cuando se carga explicitamente (show/store/anular
 * anular) -- index() no la carga a proposito, la lista no la necesita
 * (ver ReglaPrecioController para el mismo criterio de whenLoaded()).
 * `metodos_pago` es el resumen de venta_pagos ya con el nombre del
 * metodo resuelto -- evita que el frontend tenga que pedir el catalogo
 * de metodos_pago solo para poder mostrar la columna de la lista.
 */
class VentaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'lista_precio_id' => $this->resource->getAttribute('lista_precio_id') === null ? null : (int) $this->resource->getAttribute('lista_precio_id'),
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            // D-3, transitorio: número visible del documento (= id interno), solo para mostrarlo y
            // para buscar la venta en la devolución; lo reemplaza el folio de DAT-07.
            'numero' => (int) $this->getKey(),
            'fecha' => $this->fecha,
            'cliente' => $this->whenLoaded(
                'cliente',
                fn () => $this->cliente ? ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre] : null,
            ),
            'total' => DecimalApi::dinero($this->total),
            'descuento_cupon' => DecimalApi::dinero($this->descuento_cupon),
            'descuento_manual' => DecimalApi::dinero($this->descuento_manual),
            'abono_previo' => DecimalApi::dinero($this->abono_previo),
            /** @var 'completada'|'anulada' */
            'estado' => $this->estado,
            'motivo_anulacion' => $this->motivo_anulacion,
            'fecha_anulacion' => $this->fecha_anulacion,
            'es_venta_sombra' => $this->es_venta_sombra,
            'metodos_pago' => $this->whenLoaded('pagos', fn () => $this->pagos->map(fn ($pago) => [
                'metodo_pago_id' => $pago->metodo_pago_id,
                'nombre' => $pago->metodoPago?->nombre,
                'monto' => DecimalApi::dinero($pago->monto),
            ])),
            'detalles' => $this->whenLoaded('detalles', fn () => VentaLineaResource::collection($this->detalles)),
        ];
    }
}
