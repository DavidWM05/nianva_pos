<?php

namespace App\Modules\Prestamos\Providers;

use Illuminate\Support\ServiceProvider;

class PrestamosServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
