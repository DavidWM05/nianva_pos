<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use App\Modules\Inventario\Exceptions\CostoNoDisponibleException;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;

/**
 * DAT-03 y DAT-15: el costo vigente de una variante en una sucursal, leído sin bloqueo. Lo usa la
 * cotización, que no mueve stock; las operaciones que mueven stock leen el promedio de la fila que
 * la Action ya bloqueó.
 *
 * Con fila de stock es su costo promedio. Sin fila, la variante nunca tuvo una entrada en esa
 * sucursal y no hay promedio: se usa el costo de catálogo con la misma regla que
 * CargarStockInicial (el de la variante o, si no tiene, el del producto). Si el catálogo tampoco
 * tiene costo, la operación falla; nunca se rellena con 0.
 *
 * @throws CostoNoDisponibleException
 */
final class CostoVigente
{
    public static function sinBloqueo(int $sucursalId, int $varianteId): string
    {
        $stock = InventarioStock::query()
            ->withoutGlobalScopes()
            ->where('sucursal_id', $sucursalId)
            ->where('variante_id', $varianteId)
            ->first();

        if ($stock !== null) {
            return (string) $stock->getAttribute('costo_promedio');
        }

        $variante = ProductoVariante::query()->withoutGlobalScopes()->with('producto')->whereKey($varianteId)->firstOrFail();
        $producto = $variante->getRelationValue('producto');
        $costo = $variante->getAttribute('costo') ?? ($producto instanceof Producto ? $producto->getAttribute('precio_compra') : null);

        if ($costo === null) {
            throw new CostoNoDisponibleException($varianteId, $sucursalId);
        }

        return (string) $costo;
    }
}
