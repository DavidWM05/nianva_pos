<?php

namespace App\Modules\Nucleo\Observers;

use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use App\Modules\Nucleo\Models\Tenant;

/**
 * Igual que Configuracion\Observers\TenantObserver (crea la fila de
 * configuracion_tenant): aqui crea la fila de configuracion_seguridad con
 * los defaults (30/14 dias) para que todo tenant nuevo tenga una fila
 * desde el arranque, sin nulls que resolver en cada lectura.
 */
class TenantObserver
{
    public function created(Tenant $tenant): void
    {
        ConfiguracionSeguridad::create(['tenant_id' => $tenant->id]);
    }
}
