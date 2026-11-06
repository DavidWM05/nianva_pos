<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Support\Facades\DB;

/** Preparación de modelos para los tests de Services, dentro de RefreshDatabase. */
final class Bloqueos04c
{
    public static function caja(int $sucursalId): ?CajaSesion
    {
        self::exigirTransaccion();

        return CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', $sucursalId)->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();
    }

    public static function sesion(CajaSesion $caja): CajaSesion
    {
        self::exigirTransaccion();

        return CajaSesion::query()->whereKey($caja->id)->lockForUpdate()->firstOrFail();
    }

    public static function venta(Venta $venta): Venta
    {
        self::exigirTransaccion();
        self::caja((int) $venta->getAttribute('sucursal_id'));

        return Venta::query()->whereKey($venta->id)->lockForUpdate()->firstOrFail();
    }

    /** @return array<int, InventarioStock> */
    public static function stocks(int $sucursalId): array
    {
        self::exigirTransaccion();

        return InventarioStock::query()->withoutGlobalScopes()->where('sucursal_id', $sucursalId)->orderBy('variante_id')->lockForUpdate()->get()->keyBy('variante_id')->all();
    }

    private static function exigirTransaccion(): void
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('La preparación de modelos requiere la transacción del test.');
        }
    }
}
