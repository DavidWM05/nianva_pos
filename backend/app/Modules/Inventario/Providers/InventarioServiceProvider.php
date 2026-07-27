<?php

namespace App\Modules\Inventario\Providers;

use Illuminate\Support\ServiceProvider;

class InventarioServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
