<?php

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Exceptions\SucursalNoPermitidaException;
use App\Modules\Nucleo\Exceptions\SucursalRequeridaException;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;

/**
 * Resuelve la sucursal de una operacion (SEG-02): la del usuario, salvo que
 * el usuario tenga sucursales.todas y solicite otra sucursal de su tenant.
 */
final class SucursalOperacion
{
    public static function paraEscritura(Usuario $usuario, ?int $solicitada): int
    {
        $propia = self::atributoInt($usuario, 'sucursal_id');

        if ($solicitada === null || $solicitada === $propia) {
            $resultado = $propia;
        } else {
            if (! $usuario->tienePermiso('sucursales.todas') || ! self::perteneceAlTenant($usuario, $solicitada)) {
                throw new SucursalNoPermitidaException($solicitada);
            }

            $resultado = $solicitada;
        }

        if ($resultado === null) {
            throw new SucursalRequeridaException;
        }

        return $resultado;
    }

    public static function paraFiltro(Usuario $usuario, ?int $solicitada): ?int
    {
        $propia = self::atributoInt($usuario, 'sucursal_id');
        $todas = $usuario->tienePermiso('sucursales.todas');

        // Sin sucursal propia ni sucursales.todas no hay alcance: null
        // significaria "todas las sucursales".
        if (! $todas && $propia === null) {
            throw new SucursalRequeridaException;
        }

        if ($solicitada === null) {
            return $todas ? null : $propia;
        }

        if ($solicitada === $propia) {
            return $solicitada;
        }

        if ($todas && self::perteneceAlTenant($usuario, $solicitada)) {
            return $solicitada;
        }

        return $propia;
    }

    private static function perteneceAlTenant(Usuario $usuario, int $sucursalId): bool
    {
        $tenantId = self::atributoInt($usuario, 'tenant_id');

        if ($tenantId === null) {
            return false;
        }

        return Sucursal::sinTenant()
            ->where('tenant_id', $tenantId)
            ->whereKey($sucursalId)
            ->exists();
    }

    private static function atributoInt(Usuario $usuario, string $atributo): ?int
    {
        $valor = $usuario->getAttribute($atributo);

        return $valor === null ? null : (int) $valor;
    }
}
