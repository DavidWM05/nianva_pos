<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Support\Facades\DB;

/** Preparación de los modelos para probar los núcleos dentro de RefreshDatabase. */
final class Bloqueos04e
{
    public static function sucursal(int $id): Sucursal
    {
        self::exigirTransaccion();

        return Sucursal::query()->withoutGlobalScope(TenantScope::class)->whereKey($id)->lockForUpdate()->firstOrFail();
    }

    public static function stock(int $varianteId, int $sucursalId): InventarioStock
    {
        self::exigirTransaccion();
        app(InventarioService::class)->asegurarStock($varianteId, $sucursalId);

        return InventarioStock::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('variante_id', $varianteId)->where('sucursal_id', $sucursalId)->lockForUpdate()->firstOrFail();
    }

    /**
     * @param  list<int>  $variantes
     * @return array<int, InventarioStock>
     */
    public static function stocks(int $sucursalId, array $variantes): array
    {
        self::exigirTransaccion();
        $variantes = array_values(array_unique($variantes));
        sort($variantes);
        $stocks = [];
        foreach ($variantes as $id) {
            $stocks[$id] = self::stock($id, $sucursalId);
        }

        return $stocks;
    }

    /** @return array<int, InventarioStock> */
    public static function stocksApartado(Apartado $apartado): array
    {
        return self::stocks((int) $apartado->getAttribute('sucursal_id'), $apartado->detalles->pluck('variante_id')->map(static fn ($id): int => (int) $id)->all());
    }

    private static function exigirTransaccion(): void
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('La preparación de modelos requiere la transacción del test.');
        }
    }
}
