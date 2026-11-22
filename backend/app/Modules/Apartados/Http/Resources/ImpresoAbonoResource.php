<?php

declare(strict_types=1);

namespace App\Modules\Apartados\Http\Resources;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Nucleo\Http\Resources\DatosImpreso;
use App\Modules\Nucleo\Http\Resources\PagoImpresoResource;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ImpresoAbonoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $abono = $this->resource;
        if (! $abono instanceof ApartadoAbono) {
            throw new \LogicException('Se requiere un abono de apartado.');
        }

        $apartado = $abono->apartado;
        if (! $apartado instanceof Apartado) {
            throw new \LogicException('El abono requiere un apartado.');
        }
        $datos = DatosImpreso::de($apartado->sucursal, $abono->usuario, $apartado->getAttribute('folio'), $abono->getAttribute('fecha'));

        return [
            /** @var array{empresa:string,rfc:?string,telefono:?string,logo_url:?string,sucursal:string,folio:?string,fecha:?string,usuario:?string} */
            'encabezado' => $datos['encabezado'],
            /** @var list<never> */
            'lineas' => [],
            'totales' => [
                'abono' => DecimalApi::dinero($abono->getAttribute('monto')),
                'saldo_anterior' => DecimalApi::dinero($abono->getAttribute('saldo_anterior')),
                'saldo_nuevo' => DecimalApi::dinero($abono->getAttribute('saldo_nuevo')),
            ],
            'pagos' => PagoImpresoResource::collection($abono->pagos),
            /** @var array{mensaje_ticket:?string} */
            'pie' => $datos['pie'],
        ];
    }
}
