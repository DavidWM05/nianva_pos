<?php

namespace App\Modules\CuentasPagar\Providers;

use Illuminate\Support\ServiceProvider;

class CuentasPagarServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
