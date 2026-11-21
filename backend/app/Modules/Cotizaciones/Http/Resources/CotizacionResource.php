<?php

declare(strict_types=1);

namespace App\Modules\Cotizaciones\Http\Resources;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Cotizacion
 */
class CotizacionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'lista_precio_id' => $this->resource->getAttribute('lista_precio_id') === null ? null : (int) $this->resource->getAttribute('lista_precio_id'),
            // DAT-08: el identificador público es el ulid; el número visible es numero_cotizacion.
            'id' => (string) $this->resource->getAttribute('ulid'),
            'numero_cotizacion' => $this->numero_cotizacion,
            'cliente' => $this->whenLoaded('cliente', fn () => [
                'id' => (string) UlidPublico::de($this->resource, 'cliente'),
                'nombre' => $this->cliente->nombre,
            ]),
            'usuario' => $this->whenLoaded('usuario', fn () => [
                'id' => $this->usuario->id,
                'nombre' => $this->usuario->nombre,
            ]),
            'total' => DecimalApi::dinero($this->total),
            'descuento' => DecimalApi::dinero($this->descuento),
            /** @var 'pendiente'|'convertida'|'vencida'|'anulada' */
            'estado' => $this->estado,
            'validez_dias' => $this->validez_dias,
            'fecha_vencimiento' => $this->fecha_vencimiento,
            'observaciones' => $this->observaciones,
            'uso_cfdi' => $this->uso_cfdi,
            'venta_id' => UlidPublico::de($this->resource, 'venta'),
            'detalles' => CotizacionDetalleResource::collection($this->whenLoaded('detalles')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
