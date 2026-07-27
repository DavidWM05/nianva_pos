<?php

namespace App\Modules\Tpv\Providers;

use Illuminate\Support\ServiceProvider;

class TpvServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
