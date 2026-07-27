<?php

namespace App\Modules\Precios\Http\Resources;

use App\Modules\Precios\Models\ReglaPrecio;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReglaPrecio
 */
class ReglaPrecioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'tipo' => $this->tipo,
            'valor' => $this->valor,
            'cantidad_compra' => $this->cantidad_compra,
            'cantidad_paga' => $this->cantidad_paga,
            'precio_bundle' => $this->precio_bundle,
            'aplica_a' => $this->aplica_a,
            // El nombre de la entidad especifica, no solo el nivel -- ver
            // el requisito de la columna "a que aplica" en la lista.
            'categoria' => $this->whenLoaded(
                'categoria',
                fn () => $this->categoria ? ['id' => $this->categoria->id, 'nombre' => $this->categoria->nombre] : null,
            ),
            'producto' => $this->whenLoaded(
                'producto',
                fn () => $this->producto ? ['id' => $this->producto->id, 'nombre' => $this->producto->nombre] : null,
            ),
            'variante' => $this->whenLoaded('variante', fn () => $this->variante ? [
                'id' => $this->variante->id,
                'talla' => $this->variante->talla,
                'color' => $this->variante->color,
                'producto_nombre' => $this->variante->producto?->nombre,
            ] : null),
            'fecha_inicio' => $this->fecha_inicio,
            'fecha_fin' => $this->fecha_fin,
            'activo' => $this->activo,
        ];
    }
}
