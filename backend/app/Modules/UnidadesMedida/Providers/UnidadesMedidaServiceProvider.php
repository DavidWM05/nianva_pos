<?php

namespace App\Modules\UnidadesMedida\Providers;

use Illuminate\Support\ServiceProvider;

class UnidadesMedidaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
