<?php

namespace App\Modules\Configuracion\Observers;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Models\Tenant;

/**
 * Igual que Crm\Observers\TenantObserver (Cliente "Publico General"):
 * registrado desde ConfiguracionServiceProvider via Tenant::observe(), para
 * que Nucleo no importe nada de Configuracion.
 */
class TenantObserver
{
    public function created(Tenant $tenant): void
    {
        ConfiguracionTenant::create(['tenant_id' => $tenant->id]);
    }
}
