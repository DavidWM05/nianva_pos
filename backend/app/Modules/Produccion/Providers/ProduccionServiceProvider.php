<?php

namespace App\Modules\Produccion\Providers;

use Illuminate\Support\ServiceProvider;

class ProduccionServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
