<?php

namespace App\Modules\Crm\Observers;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Tenant;

/**
 * Al crearse un Tenant, siembra su cliente "Publico General" -- el cliente
 * generico que usan las ventas de mostrador sin registrar a alguien
 * especifico. Registrado desde CrmServiceProvider via Tenant::observe(),
 * nunca dentro del modelo Tenant: Nucleo no se modifica ni se entera de que
 * el modulo Crm existe, igual que Auditoria engancha Usuario/Rol desde
 * afuera en vez de un trait dentro de esos modelos.
 */
class TenantObserver
{
    public function created(Tenant $tenant): void
    {
        Cliente::create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Publico General',
            'es_sistema' => true,
        ]);
    }
}
