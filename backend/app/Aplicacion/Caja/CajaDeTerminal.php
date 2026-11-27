<?php

declare(strict_types=1);

namespace App\Aplicacion\Caja;

use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Tpv\Models\CajaSesion;

final class CajaDeTerminal
{
    public static function bloquearAbierta(Usuario $usuario, ?Terminal $terminal): ?CajaSesion
    {
        if ($terminal === null || $terminal->tenant_id !== (int) $usuario->getAttribute('tenant_id') || $terminal->sucursal_id !== (int) $usuario->getAttribute('sucursal_id')) {
            return null;
        }

        return CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)
            ->where('sucursal_id', $terminal->sucursal_id)
            ->where('terminal_id', $terminal->id)
            ->where('estado', 'abierta')
            ->lockForUpdate()
            ->first();
    }
}
