<?php

declare(strict_types=1);

namespace App\Aplicacion\Inventario;

use App\Modules\Inventario\Dtos\CargaInicialInventarioDto;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Support\Facades\DB;

final class CargarStockInicial
{
    public function __construct(private readonly RegistrarMovimiento $movimiento, private readonly InventarioService $inventario) {}

    public function ejecutar(CargaInicialInventarioDto $dto): Kardex
    {
        $operacion = function () use ($dto): Kardex {
            $stock = $this->movimiento->bloquearStock(new MovimientoInventarioDto($dto->varianteId, $dto->sucursalId, 'entrada', $dto->cantidad, 'ajuste', $dto->usuarioId));
            $variante = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->findOrFail($dto->varianteId);
            $producto = $variante->producto()->firstOrFail();
            $costo = $variante->getAttribute('costo') ?? $producto->getAttribute('precio_compra');

            return $this->inventario->registrarMovimientoConStock($stock, 'entrada', $dto->cantidad, 'ajuste', $dto->usuarioId, costoUnitario: (string) $costo);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
