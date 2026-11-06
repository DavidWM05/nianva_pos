<?php

declare(strict_types=1);

namespace App\Aplicacion\Produccion;

use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\Receta;
use Illuminate\Support\Facades\DB;

final class BloqueosProduccion
{
    public function receta(int $id): Receta
    {
        $this->exigirTransaccion();

        return Receta::query()->whereKey($id)->lockForUpdate()->firstOrFail()->load('ingredientes.insumo');
    }

    /** @return array<int, list<InsumoStock>> */
    public function lotes(Receta $receta, int $sucursalId): array
    {
        $this->exigirTransaccion();
        $ids = array_values(array_unique($receta->ingredientes->pluck('insumo_id')->map(static fn ($id): int => (int) $id)->all()));
        sort($ids);
        $lotes = [];
        foreach ($ids as $id) {
            Insumo::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $lotes[$id] = array_values(InsumoStock::query()->where('insumo_id', $id)->where('sucursal_id', $sucursalId)->orderBy('fecha_vencimiento')->orderBy('id')->lockForUpdate()->get()->all());
        }

        return $lotes;
    }

    private function exigirTransaccion(): void
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('Los bloqueos de producción requieren una transacción activa.');
        }
    }
}
