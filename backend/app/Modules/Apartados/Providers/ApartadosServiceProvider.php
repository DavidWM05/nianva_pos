<?php

namespace App\Modules\Apartados\Providers;

use Illuminate\Support\ServiceProvider;

class ApartadosServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
