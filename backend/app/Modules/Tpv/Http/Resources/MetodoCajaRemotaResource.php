<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Tpv\Models\CajaSesionSaldo;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CajaSesionSaldo */
final class MetodoCajaRemotaResource extends JsonResource
{
    /** @return array{metodo_pago_id: int, nombre: string} */
    public function toArray(Request $request): array
    {
        $metodo = $this->resource->getRelationValue('metodoPago');
        if (! $metodo instanceof MetodoPago) {
            throw new \LogicException('El renglón de caja requiere su método de pago.');
        }

        return [
            'metodo_pago_id' => (int) $this->resource->getAttribute('metodo_pago_id'),
            'nombre' => (string) $metodo->getAttribute('nombre'),
        ];
    }
}
