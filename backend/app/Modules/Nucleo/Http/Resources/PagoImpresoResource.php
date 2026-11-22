<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class PagoImpresoResource extends JsonResource
{
    /** @return array{metodo_pago_id:int,nombre:?string,monto:string} */
    public function toArray(Request $request): array
    {
        $pago = $this->resource;
        if (! $pago instanceof Model) {
            throw new \LogicException('Se requiere un pago del documento.');
        }

        $metodo = $pago->getRelation('metodoPago');

        return [
            'metodo_pago_id' => (int) $pago->getAttribute('metodo_pago_id'),
            'nombre' => $metodo instanceof Model ? (string) $metodo->getAttribute('nombre') : null,
            'monto' => DecimalApi::dinero($pago->getAttribute('monto')),
        ];
    }
}
