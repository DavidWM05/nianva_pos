<?php

declare(strict_types=1);

namespace App\Modules\Apartados\Http\Resources;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Apartado
 *
 * `detalles`/`abonos` solo viajan cuando se cargan explicitamente (show(),
 * no index()) -- mismo criterio que VentaResource. El saldo pendiente
 * (total - total_abonado) no se manda calculado: es resta simple, el
 * frontend la hace igual que ya hace con el resto de los totales -- no es
 * "logica de precios" que deba resolver el backend (a diferencia del
 * precio de una linea, que si viene siempre de PricingService).
 */
class ApartadoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'lista_precio_id' => $this->resource->getAttribute('lista_precio_id') === null ? null : (int) $this->resource->getAttribute('lista_precio_id'),
            // DAT-08: el identificador público es el ulid; el id interno no sale de la API.
            'id' => (string) $this->resource->getAttribute('ulid'),
            /** @var string|null */
            'folio' => $this->resource->getAttribute('folio'),
            'fecha_creacion' => $this->fecha_creacion,
            'cliente' => $this->whenLoaded(
                'cliente',
                fn () => $this->cliente ? ['id' => (string) $this->cliente->getAttribute('ulid'), 'nombre' => $this->cliente->nombre] : null,
            ),
            'total' => DecimalApi::dinero($this->total),
            'total_abonado' => DecimalApi::dinero($this->total_abonado),
            /** @var 'activo'|'completado'|'cancelado' */
            'estado' => $this->estado,
            'fecha_vencimiento' => $this->fecha_vencimiento,
            'fecha_completado' => $this->fecha_completado,
            'fecha_cancelado' => $this->fecha_cancelado,
            'motivo_cancelacion' => $this->motivo_cancelacion,
            'venta_id' => UlidPublico::de($this->resource, 'venta'),
            'notas' => $this->notas,
            'detalles' => $this->whenLoaded('detalles', fn () => $this->detalles->map(fn ($detalle) => [
                'id' => (string) $detalle->getAttribute('ulid'),
                'variante_id' => $detalle->variante_id,
                'variante' => $detalle->variante ? [
                    'id' => $detalle->variante->id,
                    'nombre' => $detalle->variante->nombreDeAtributos(),
                    'producto_nombre' => $detalle->variante->producto?->nombre,
                ] : null,
                'cantidad' => DecimalApi::cantidad($detalle->cantidad),
                'precio_unitario' => DecimalApi::dinero($detalle->precio_unitario),
                'subtotal' => DecimalApi::dinero($detalle->subtotal),
                // DAT-03: la foto de la línea, nunca el catálogo actual.
                'descuento' => DecimalApi::dinero($detalle->getAttribute('descuento')),
                'lista_precio_nombre' => $detalle->getAttribute('lista_precio_nombre'),
                'regla_nombre' => $detalle->getAttribute('regla_nombre'),
                'tasa_impuesto' => DecimalApi::tasa((string) $detalle->getAttribute('tasa_impuesto')),
                'exento' => (bool) $detalle->getAttribute('exento'),
                'impuesto' => DecimalApi::dinero($detalle->getAttribute('impuesto')),
                'unidad_medida_id' => (int) $detalle->getAttribute('unidad_medida_id'),
            ])),
            'abonos' => $this->whenLoaded('abonos', fn () => $this->abonos->map(fn ($abono) => [
                'id' => (string) $abono->getAttribute('ulid'),
                'monto' => DecimalApi::dinero($abono->monto),
                'fecha' => $abono->fecha,
                'notas' => $abono->notas,
                'pagos' => $abono->pagos->map(fn ($pago) => [
                    'metodo_pago_id' => $pago->metodo_pago_id,
                    'nombre' => $pago->metodoPago?->nombre,
                    'monto' => DecimalApi::dinero($pago->monto),
                ]),
            ])),
        ];
    }
}
