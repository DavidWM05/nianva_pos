<?php

namespace App\Modules\Precios\Providers;

use Illuminate\Support\ServiceProvider;

class PrecioServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
