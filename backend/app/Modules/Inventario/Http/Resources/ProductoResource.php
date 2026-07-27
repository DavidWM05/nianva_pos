<?php

namespace App\Modules\Inventario\Http\Resources;

use App\Modules\Inventario\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Producto
 */
class ProductoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'categoria' => $this->whenLoaded(
                'categoria',
                fn () => $this->categoria ? ['id' => $this->categoria->id, 'nombre' => $this->categoria->nombre] : null,
            ),
            'departamento' => $this->whenLoaded(
                'departamento',
                fn () => $this->departamento ? ['id' => $this->departamento->id, 'nombre' => $this->departamento->nombre] : null,
            ),
            'precio_compra' => $this->precio_compra,
            'precio_venta' => $this->precio_venta,
            'imagen_url' => $this->imagen_url,
            'no_resurtible' => $this->no_resurtible,
            'sin_descuento' => $this->sin_descuento,
            'activo' => $this->activo,
            // Solo presente en index() (via selectSub) -- show() no lo
            // necesita, ahi se ven las variantes con su stock por sucursal
            // directamente. COALESCE en la subquery garantiza que nunca sea
            // null cuando SI esta presente, asi que !== null basta para
            // distinguir "viene de index()" de "viene de show()".
            'stock_total' => $this->when($this->stock_total !== null, fn () => (int) $this->stock_total),
            'variantes' => ProductoVarianteResource::collection($this->whenLoaded('variantes')),
        ];
    }
}
