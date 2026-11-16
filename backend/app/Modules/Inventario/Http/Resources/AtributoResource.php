<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Resources;

use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Atributo */
class AtributoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $atributo = $this->resource;
        if (! $atributo instanceof Atributo) {
            throw new \LogicException('AtributoResource solo serializa atributos.');
        }

        return [
            'id' => $atributo->id,
            'nombre' => $atributo->nombre,
            'orden' => $atributo->orden,
            'valores' => $this->whenLoaded('valores', fn () => $atributo->valores->map(fn (AtributoValor $valor) => [
                'id' => $valor->id,
                'nombre' => $valor->valor,
                'orden' => $valor->orden,
            ])),
        ];
    }
}
