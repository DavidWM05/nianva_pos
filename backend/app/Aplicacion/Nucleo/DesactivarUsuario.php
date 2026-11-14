<?php

declare(strict_types=1);

namespace App\Aplicacion\Nucleo;

use App\Modules\Nucleo\Exceptions\DesactivarPropioUsuarioException;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\ReglasUltimoAdmin;
use Illuminate\Support\Facades\DB;

/**
 * DAT-10: un usuario nunca se borra, se desactiva. Nadie se desactiva a si mismo y el ultimo
 * admin activo del tenant no se desactiva.
 */
final class DesactivarUsuario
{
    public function ejecutar(Usuario $usuario, Usuario $actor): Usuario
    {
        if ($usuario->is($actor)) {
            throw new DesactivarPropioUsuarioException((int) $usuario->getKey());
        }

        $operacion = function () use ($usuario): Usuario {
            $usuario = Usuario::query()->whereKey($usuario->getKey())->lockForUpdate()->firstOrFail();
            ReglasUltimoAdmin::exigirOtroAdmin($usuario, fn ($consulta) => $consulta->lockForUpdate());
            $usuario->update(['activo' => false]);

            return $usuario;
        };

        return DB::transactionLevel() > 0 ? $operacion() : DB::transaction($operacion);
    }
}
