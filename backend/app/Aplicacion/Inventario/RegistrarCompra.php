<?php

declare(strict_types=1);

namespace App\Aplicacion\Inventario;

use App\Modules\Inventario\Dtos\CompraDto;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Support\Facades\DB;

final class RegistrarCompra
{
    public function __construct(private readonly InventarioService $inventarioService, private readonly RegistrarMovimiento $movimiento) {}

    /** Reutiliza la transacción de la Action llamadora cuando exista. */
    public function ejecutar(CompraDto $dto, Usuario $usuario): Compra
    {
        $operacion = function () use ($dto, $usuario): Compra {
            $items = array_map(static fn (LineaCompraDto $linea): array => ['variante_id' => $linea->varianteId, 'cantidad' => $linea->cantidad, 'precio_compra' => $linea->precioCompra], $dto->items);
            $variantes = array_values(array_unique(array_column($items, 'variante_id')));
            sort($variantes);
            $stocks = [];
            foreach ($variantes as $varianteId) {
                $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, (int) $usuario->getAttribute('sucursal_id'), 'entrada', 1, 'compra', $usuario->id));
            }

            return $this->inventarioService->registrarCompraConStocks([
                'tenant_id' => (int) $usuario->getAttribute('tenant_id'),
                'sucursal_id' => (int) $usuario->getAttribute('sucursal_id'),
                'usuario_id' => $usuario->id,
                'proveedor_id' => $dto->proveedorId,
                'numero_comprobante' => $dto->numeroComprobante,
            ], $items, $stocks);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
