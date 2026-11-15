<?php

namespace App\Modules\GiftCards\Http\Resources;

use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Nucleo\Support\DecimalApi;
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
            'saldo_inicial' => DecimalApi::dinero($this->saldo_inicial),
            'saldo_actual' => DecimalApi::dinero($this->saldo_actual),
            'fecha_expiracion' => $this->fecha_expiracion,
            'recargas' => $this->whenLoaded('recargas', fn () => $this->recargas->map(fn ($r) => [
                'id' => $r->id,
                'monto' => DecimalApi::dinero($r->monto),
                'usuario' => $r->usuario ? ['id' => $r->usuario->id, 'nombre' => $r->usuario->nombre] : null,
                'fecha' => $r->fecha,
            ])),
            /** @var 'activa'|'usada'|'expirada'|'cancelada' */
            'estado' => $this->estado,
            'created_at' => $this->created_at,
        ];
    }
}
