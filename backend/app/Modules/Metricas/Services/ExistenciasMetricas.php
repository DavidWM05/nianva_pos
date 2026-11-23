<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Services;

use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Metricas\Valores\ContextoMetricas;
use Illuminate\Database\Eloquent\Builder;

final class ExistenciasMetricas
{
    public function productosActivos(ContextoMetricas $contexto): int
    {
        return Producto::query()
            ->where('tenant_id', $contexto->tenantId)
            ->where('activo', true)
            ->count();
    }

    public function alertasStockBajo(ContextoMetricas $contexto): int
    {
        return InventarioStock::query()
            ->whereHas('sucursal', fn (Builder $consulta) => $consulta->where('tenant_id', $contexto->tenantId))
            ->whereHas('variante', fn (Builder $consulta) => $consulta
                ->where('tenant_id', $contexto->tenantId)
                ->where('activo', true))
            ->when($contexto->sucursalId !== null, fn ($consulta) => $consulta->where('sucursal_id', $contexto->sucursalId))
            ->where('stock_minimo', '>', 0)
            ->whereColumn('stock_actual', '<=', 'stock_minimo')
            ->count();
    }
}
