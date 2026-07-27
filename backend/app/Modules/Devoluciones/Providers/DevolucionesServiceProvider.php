<?php

namespace App\Modules\Devoluciones\Providers;

use Illuminate\Support\ServiceProvider;

class DevolucionesServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
