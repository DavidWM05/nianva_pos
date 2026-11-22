<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Http\Resources\DatosImpreso;
use App\Modules\Nucleo\Http\Resources\PagoImpresoResource;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ImpresoVentaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $venta = $this->resource;
        if (! $venta instanceof Venta) {
            throw new \LogicException('Se requiere una venta.');
        }

        $datos = DatosImpreso::de($venta->sucursal, $venta->usuario, $venta->getAttribute('folio'), $venta->getAttribute('fecha'));

        return [
            /** @var array{empresa:string,rfc:?string,telefono:?string,logo_url:?string,sucursal:string,folio:?string,fecha:?string,usuario:?string} */
            'encabezado' => $datos['encabezado'],
            'lineas' => VentaLineaResource::collection($venta->detalles),
            'totales' => [
                'total' => DecimalApi::dinero($venta->getAttribute('total')),
                'descuento_cupon' => DecimalApi::dinero($venta->getAttribute('descuento_cupon')),
                'descuento_manual' => DecimalApi::dinero($venta->getAttribute('descuento_manual')),
                'abono_previo' => DecimalApi::dinero($venta->getAttribute('abono_previo')),
            ],
            'pagos' => PagoImpresoResource::collection($venta->pagos),
            /** @var array{mensaje_ticket:?string} */
            'pie' => $datos['pie'],
        ];
    }
}
