<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Http\Resources\DatosImpreso;
use App\Modules\Nucleo\Http\Resources\PagoImpresoResource;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

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

        $detalles = $venta->detalles;
        $ids = $detalles->pluck('unidad_medida_id')->unique()->all();
        $nombres = $ids === [] ? collect() : DB::table('unidades_medida')
            ->whereIn('id', $ids)
            ->where(fn ($query) => $query->whereNull('tenant_id')->orWhere('tenant_id', $venta->getAttribute('tenant_id')))
            ->pluck('nombre', 'id');

        return [
            /** @var array{empresa:string,rfc:?string,telefono:?string,logo_url:?string,sucursal:string,folio:?string,fecha:?string,usuario:?string} */
            'encabezado' => $datos['encabezado'],
            /** @var list<ImpresoVentaLineaResource> */
            'lineas' => $detalles->map(function ($detalle) use ($nombres): ImpresoVentaLineaResource {
                $nombre = $nombres->get($detalle->getAttribute('unidad_medida_id'));

                return new ImpresoVentaLineaResource($detalle, is_string($nombre) ? $nombre : null);
            })->values()->all(),
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
