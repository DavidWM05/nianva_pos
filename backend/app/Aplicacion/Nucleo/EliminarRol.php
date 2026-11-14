<?php

declare(strict_types=1);

namespace App\Aplicacion\Nucleo;

use App\Modules\Nucleo\Exceptions\TieneMovimientosException;
use App\Modules\Nucleo\Models\Rol;
use Illuminate\Support\Facades\DB;

/**
 * Rol no tiene `activo`: el DELETE es fisico y solo procede sin usuarios asignados (DAT-10), para
 * no dejar usuarios sin rol de golpe. La guarda de rol de sistema queda en el controlador
 * (GuardasDeRecurso::rolSistema()).
 */
final class EliminarRol
{
    public function ejecutar(Rol $rol): void
    {
        $operacion = function () use ($rol): void {
            $rol = Rol::query()->whereKey($rol->getKey())->lockForUpdate()->firstOrFail();

            if ($rol->usuarios()->exists()) {
                throw new TieneMovimientosException(
                    'rol',
                    (int) $rol->getKey(),
                    'No puedes eliminar un rol con usuarios asignados. Quita el rol de esos usuarios primero.',
                );
            }

            $rol->delete();
        };

        DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
