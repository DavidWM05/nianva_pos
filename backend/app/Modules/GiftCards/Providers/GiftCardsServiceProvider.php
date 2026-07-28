<?php

namespace App\Modules\GiftCards\Providers;

use Illuminate\Support\ServiceProvider;

class GiftCardsServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
    }
}
