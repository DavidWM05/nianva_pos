<?php

namespace App\Modules\Cotizaciones\Providers;

use Illuminate\Support\ServiceProvider;

class CotizacionesServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
