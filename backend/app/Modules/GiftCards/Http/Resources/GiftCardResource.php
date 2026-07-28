<?php

namespace App\Modules\GiftCards\Http\Resources;

use App\Modules\GiftCards\Models\GiftCard;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GiftCard */
class GiftCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre]),
            'codigo' => $this->codigo,
            'saldo_inicial' => $this->saldo_inicial,
            'saldo_actual' => $this->saldo_actual,
            'fecha_expiracion' => $this->fecha_expiracion,
            'recargas' => $this->whenLoaded('recargas', fn () => $this->recargas->map(fn ($r) => [
                'id' => $r->id,
                'monto' => $r->monto,
                'usuario' => $r->usuario ? ['id' => $r->usuario->id, 'nombre' => $r->usuario->nombre] : null,
                'fecha' => $r->fecha,
            ])),
            'estado' => $this->estado,
            'created_at' => $this->created_at,
        ];
    }
}
