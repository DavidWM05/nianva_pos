<?php

namespace App\Modules\Gastos\Providers;

use Illuminate\Support\ServiceProvider;

class GastosServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
