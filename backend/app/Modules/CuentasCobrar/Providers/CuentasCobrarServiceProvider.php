<?php

namespace App\Modules\CuentasCobrar\Providers;

use Illuminate\Support\ServiceProvider;

class CuentasCobrarServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
