<?php

namespace App\Modules\Auditoria\Providers;

use App\Modules\Auditoria\Observers\AuditObserver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AuditoriaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/auditoria.php', 'auditoria');
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        /** @var array<int, class-string<Model>> $auditables */
        $auditables = config('auditoria.auditables', []);

        foreach ($auditables as $modelo) {
            $modelo::observe(AuditObserver::class);
        }

        /** @var array<class-string<Model>, array<string, mixed>> $pivotes */
        $pivotes = config('auditoria.pivotes', []);

        foreach (array_keys($pivotes) as $pivote) {
            $pivote::observe(AuditObserver::class);
        }
    }
}
