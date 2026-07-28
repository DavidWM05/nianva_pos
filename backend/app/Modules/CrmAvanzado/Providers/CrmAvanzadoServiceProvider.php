<?php

namespace App\Modules\CrmAvanzado\Providers;

use Illuminate\Support\ServiceProvider;

class CrmAvanzadoServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
