<?php

namespace App\Modules\Inventario\Http\Resources;

use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductoVariante
 */
class ProductoVarianteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'producto_id' => $this->producto_id,
            'talla' => $this->talla,
            'color' => $this->color,
            'codigo_barras' => $this->codigo_barras,
            'activo' => $this->activo,
            // Solo las filas que YA existen en inventario_stock -- una
            // sucursal sin movimientos registrados todavia simplemente no
            // aparece, no se sintetiza una fila en cero (ver
            // InventarioService::registrarMovimiento(), la unica escritura
            // real de esta tabla).
            'stock' => $this->whenLoaded(
                'stock',
                fn () => $this->stock->map(fn ($fila) => [
                    'sucursal_id' => $fila->sucursal_id,
                    'sucursal_nombre' => $fila->sucursal?->nombre,
                    'stock_actual' => $fila->stock_actual,
                    'stock_minimo' => $fila->stock_minimo,
                ]),
            ),
            // Resuelto server-side para la sucursal del usuario que pide el
            // recurso -- a diferencia de `stock` (todas las sucursales, para
            // la pantalla de Inventario), esto es lo unico que necesita el
            // TPV/Apartados para validar la cantidad en vivo antes de
            // someter (ver LineasProductoComponent). 0 si no hay fila
            // todavia, nunca null, para que el frontend no tenga que
            // distinguir "sin stock" de "sin dato".
            'stock_actual' => $this->when(
                $this->relationLoaded('stock'),
                fn () => (int) ($this->stock->firstWhere('sucursal_id', $request->user()?->sucursal_id)?->stock_actual ?? 0),
            ),
        ];
    }
}
