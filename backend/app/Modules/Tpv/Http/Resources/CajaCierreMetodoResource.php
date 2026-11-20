<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\CajaCierreMetodo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CajaCierreMetodo */
class CajaCierreMetodoResource extends JsonResource
{
    /** @return array<string,mixed> */
    public function toArray(Request $request): array
    {
        $fila = $this->resource;
        if (! $fila instanceof CajaCierreMetodo) {
            throw new \LogicException('El recurso requiere su fila de caja por método.');
        }
        $metodo = $fila->getRelationValue('metodoPago');
        if (! $metodo instanceof MetodoPago) {
            throw new \LogicException('El renglón de caja requiere su método de pago.');
        }

        return ['metodo_pago_id' => (int) $fila->getAttribute('metodo_pago_id'), 'nombre' => (string) $metodo->getAttribute('nombre'), 'total_teorico' => DecimalApi::dinero($fila->getAttribute('total_teorico')), 'monto_contado' => DecimalApi::dinero($fila->getAttribute('monto_contado')), 'diferencia' => DecimalApi::dinero($fila->getAttribute('diferencia'))];
    }
}
