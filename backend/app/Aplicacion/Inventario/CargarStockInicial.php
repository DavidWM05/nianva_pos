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
            // DAT-05: si la fila de stock nace aquí, su primer y único movimiento es el saldo
            // inicial con su cantidad y su costo; si ya existía, la carga es un ajuste de entrada.
            $creada = $this->inventario->asegurarStock($dto->varianteId, $dto->sucursalId, $dto->usuarioId, escribirSaldoInicial: false);
            $stock = $this->movimiento->bloquearStock(new MovimientoInventarioDto($dto->varianteId, $dto->sucursalId, 'entrada', $dto->cantidad, 'ajuste', $dto->usuarioId));
            $variante = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->findOrFail($dto->varianteId);
            $producto = $variante->producto()->firstOrFail();
            $costo = $variante->getAttribute('costo') ?? $producto->getAttribute('precio_compra');

            if ($creada) {
                return $this->inventario->registrarSaldoInicial($stock, $dto->cantidad, (string) $costo, $dto->usuarioId);
            }

            return $this->inventario->registrarMovimientoConStock($stock, 'entrada', $dto->cantidad, 'ajuste', $dto->usuarioId, costoUnitario: (string) $costo);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
