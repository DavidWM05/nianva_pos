<?php

namespace App\Modules\Configuracion\Providers;

use App\Modules\Configuracion\Observers\TenantObserver;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Support\ServiceProvider;

class ConfiguracionServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        Tenant::observe(TenantObserver::class);
    }
}
