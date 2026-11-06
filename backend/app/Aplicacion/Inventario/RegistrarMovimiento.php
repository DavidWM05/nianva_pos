<?php

declare(strict_types=1);

namespace App\Aplicacion\Inventario;

use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Support\Facades\DB;

final class RegistrarMovimiento
{
    public function __construct(private readonly InventarioService $inventarioService) {}

    /** Dentro de otra Action reutiliza su transacción y mantiene el bloqueo hasta su commit. */
    public function ejecutar(MovimientoInventarioDto $dto): Kardex
    {
        $operacion = function () use ($dto): Kardex {
            $stock = $this->bloquearStock($dto);

            return $this->inventarioService->registrarMovimientoConStock($stock, $dto->tipo, $dto->cantidad, $dto->motivo, $dto->usuarioId, $dto->referenciaTabla, $dto->referenciaId);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }

    /** Para Actions compuestas: asegura la fila y la bloquea sin abrir otra transacción. */
    public function bloquearStock(MovimientoInventarioDto $dto): InventarioStock
    {
        $this->inventarioService->asegurarStock($dto->varianteId, $dto->sucursalId);

        // sinTenant (aquí withoutGlobalScope): esta capa ya recibe ids explicitos y validados
        // (verificarMismoTenant arriba); consultar con el scope normal
        // aqui podria hacer que una fila EXISTENTE mal filtrada parezca
        // "no encontrada". La fila ya existe (recien creada arriba o de
        // antes) asi que lockForUpdate ahora si bloquea sobre una fila
        // real y serializa cualquier otro movimiento concurrente sobre
        // la misma variante+sucursal hasta que esta transaccion termine.
        return InventarioStock::query()->withoutGlobalScope(TenantScopeViaRelacion::class)
            ->where('sucursal_id', $dto->sucursalId)
            ->where('variante_id', $dto->varianteId)
            ->lockForUpdate()
            ->firstOrFail();
    }
}
