<?php

namespace App\Modules\GiftCards\Http\Resources;

use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\UlidPublico;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin GiftCard */
class GiftCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            // DAT-08: el identificador público es el ulid; el número visible es `codigo`.
            'id' => (string) $this->resource->getAttribute('ulid'),
            /** @var array{id: int, nombre: string}|null */
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => (string) UlidPublico::de($this->resource, 'cliente'), 'nombre' => $this->cliente->nombre]),
            'codigo' => $this->codigo,
            'saldo_inicial' => DecimalApi::dinero($this->saldo_inicial),
            'saldo_actual' => DecimalApi::dinero($this->saldo_actual),
            'fecha_expiracion' => $this->fecha_expiracion,
            'recargas' => $this->whenLoaded('recargas', fn () => $this->recargas->map(fn ($r) => [
                'id' => (string) $r->getAttribute('ulid'),
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
