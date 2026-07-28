<?php

namespace App\Modules\NotasCredito\Providers;

use Illuminate\Support\ServiceProvider;

class NotasCreditoServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
