<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CotizacionVentaLineaResource extends JsonResource
{
    /** @return array<string,mixed> */
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        return ['variante_id' => (int) $r['variante_id'], 'regla_precio_id' => $r['regla_precio_id'] === null ? null : (int) $r['regla_precio_id'], 'cantidad' => DecimalApi::cantidad($r['cantidad']), 'precio_unitario' => DecimalApi::dinero($r['precio_unitario']), 'descuento_aplicado' => DecimalApi::dinero($r['descuento_aplicado']), 'subtotal' => DecimalApi::dinero($r['subtotal']),
            'presentacion_id' => $this->when(isset($r['presentacion_id']), fn () => (int) $r['presentacion_id']),
            'presentacion_nombre' => $this->when(isset($r['presentacion_id']), fn () => (string) $r['presentacion_nombre']),
            'factor' => $this->when(isset($r['presentacion_id']), fn () => DecimalApi::cantidad($r['factor']))];
    }
}
