<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Http\Resources\DatosImpreso;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ImpresoCorteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $caja = $this->resource;
        if (! $caja instanceof CajaSesion) {
            throw new \LogicException('Se requiere una sesión de caja.');
        }

        $datos = DatosImpreso::de($caja->sucursal, $caja->usuarioCierre ?? $caja->usuario, $caja->getAttribute('folio'), $caja->getAttribute('fecha_cierre'));
        $teorico = $caja->getAttribute('total_teorico');
        $contado = $caja->getAttribute('monto_cierre');
        $diferencia = $caja->getAttribute('diferencia');

        return [
            /** @var array{empresa:string,rfc:?string,telefono:?string,logo_url:?string,sucursal:string,folio:?string,fecha:?string,usuario:?string} */
            'encabezado' => $datos['encabezado'],
            'lineas' => CajaCierreMetodoResource::collection($caja->cierreMetodos),
            'totales' => [
                'total_teorico' => $teorico === null ? null : DecimalApi::dinero($teorico),
                'monto_contado' => $contado === null ? null : DecimalApi::dinero($contado),
                'diferencia' => $diferencia === null ? null : DecimalApi::dinero($diferencia),
            ],
            /** @var list<never> */
            'pagos' => [],
            /** @var array{mensaje_ticket:?string} */
            'pie' => $datos['pie'],
        ];
    }
}
