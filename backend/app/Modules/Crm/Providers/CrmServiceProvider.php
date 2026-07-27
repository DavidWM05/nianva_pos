<?php

namespace App\Modules\Crm\Providers;

use App\Modules\Crm\Observers\TenantObserver;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Support\ServiceProvider;

class CrmServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        Tenant::observe(TenantObserver::class);
    }
}
