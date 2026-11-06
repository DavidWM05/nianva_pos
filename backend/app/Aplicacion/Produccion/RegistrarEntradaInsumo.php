<?php

declare(strict_types=1);

namespace App\Aplicacion\Produccion;

use App\Modules\Produccion\Dtos\InsumoStockDto;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Services\ProduccionService;
use Illuminate\Support\Facades\DB;

final class RegistrarEntradaInsumo
{
    public function __construct(private readonly ProduccionService $service) {}

    public function ejecutar(InsumoStockDto $dto, int $insumoId): InsumoStock
    {
        $operacion = function () use ($dto, $insumoId) {
            $insumo = Insumo::query()->whereKey($insumoId)->lockForUpdate()->firstOrFail();
            $stock = InsumoStock::query()->where('insumo_id', $insumoId)->where('sucursal_id', $dto->sucursalId)->where('lote', $dto->lote)->lockForUpdate()->first();

            return $this->service->registrarEntradaInsumo($insumo, $stock, $dto->sucursalId, $dto->cantidad, $dto->lote, $dto->fechaVencimiento);
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
