<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Services;

use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Tpv\Dtos\BuscarCodigoDto;
use App\Modules\Tpv\Dtos\CodigoVentaDto;

final class ResolverCodigoVenta
{
    public function resolver(BuscarCodigoDto $dto): CodigoVentaDto
    {
        $p = Presentacion::query()->withoutGlobalScope(TenantScope::class)->where('tenant_id', $dto->tenantId)->where('codigo_barras', $dto->codigo)->first();
        $q = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('tenant_id', $dto->tenantId)->where('activo', true);
        $v = $p === null ? $q->where('codigo_barras', $dto->codigo)->firstOrFail() : $q->whereKey($p->getAttribute('variante_id'))->firstOrFail();
        $producto = Producto::query()->withoutGlobalScope(TenantScope::class)->where('tenant_id', $dto->tenantId)->whereKey($v->getAttribute('producto_id'))->where('activo', true)->firstOrFail();
        $stock = $dto->sucursalId === null ? 0 : InventarioStock::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('variante_id', $v->getKey())->where('sucursal_id', $dto->sucursalId)->value('stock_actual');

        return new CodigoVentaDto((int) $v->getKey(), (string) $producto->getAttribute('nombre'), $p === null ? null : (int) $p->getKey(), $p?->getAttribute('nombre'), $p === null ? '1.000' : (string) $p->getAttribute('factor'), Cantidad::cadena($stock ?? 0));
    }
}
