<?php

declare(strict_types=1);

namespace App\Aplicacion\Caja;

use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Database\Eloquent\Collection;

final class ObtenerCajasRemotas
{
    /** @return Collection<int, CajaSesion> */
    public function ejecutar(int $sucursalId, ?Terminal $terminal): Collection
    {
        $consulta = CajaSesion::query()
            ->where('sucursal_id', $sucursalId)
            ->where('estado', 'abierta');

        if ($terminal !== null) {
            $consulta->where('terminal_id', '<>', $terminal->id);
        }

        return $consulta
            ->with(['terminal', 'saldos.metodoPago'])
            ->orderBy('fecha_apertura')->get();
    }
}
