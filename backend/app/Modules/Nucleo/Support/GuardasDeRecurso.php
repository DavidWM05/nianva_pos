<?php

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;

final class GuardasDeRecurso
{
    public static function rolSistema(Rol $rol, ?Usuario $usuario): void
    {
        if ((bool) $rol->getAttribute('es_sistema') && ! $usuario?->esSuperadmin()) {
            abort(403, 'Este es un rol de sistema y solo un superadmin puede modificarlo.');
        }
    }

    public static function metodoPagoGlobal(MetodoPago $metodoPago, ?Usuario $usuario): void
    {
        if ($metodoPago->getAttribute('tenant_id') === null && ! $usuario?->esSuperadmin()) {
            abort(403, 'Este es un método de pago global y no se puede modificar.');
        }
    }
}
