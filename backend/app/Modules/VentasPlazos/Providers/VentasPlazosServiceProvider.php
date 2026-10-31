<?php

namespace App\Modules\VentasPlazos\Providers;

use Illuminate\Support\ServiceProvider;

class VentasPlazosServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
