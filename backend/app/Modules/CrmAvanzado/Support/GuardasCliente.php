<?php

namespace App\Modules\CrmAvanzado\Support;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Usuario;

final class GuardasCliente
{
    public static function delTenant(Cliente $cliente, ?Usuario $usuario): void
    {
        if ($cliente->getAttribute('tenant_id') !== $usuario?->getAttribute('tenant_id')) {
            abort(404);
        }
    }
}
