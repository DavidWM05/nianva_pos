<?php

namespace App\Modules\Nucleo\Providers;

use App\Modules\Nucleo\Console\Commands\ActivarLicenciaCommand;
use App\Modules\Nucleo\Console\Commands\RevalidarLicenciasCommand;
use App\Modules\Nucleo\Http\Middleware\CheckPermiso;
use App\Modules\Nucleo\Http\Middleware\EnsureTwoFactorIsConfigured;
use App\Modules\Nucleo\Http\Middleware\RequiereDosFactorReciente;
use App\Modules\Nucleo\Http\Middleware\ResolveTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Observers\TenantObserver;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

/**
 * Punto de entrada del modulo Nucleo. Concentra todo lo que este modulo
 * necesita registrar en el framework para poder empaquetarse como un
 * paquete Composer independiente mas adelante.
 */
class NucleoServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
    }

    public function boot(Router $router): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        $router->aliasMiddleware('resolve.tenant', ResolveTenant::class);
        $router->aliasMiddleware('permiso', CheckPermiso::class);
        $router->aliasMiddleware('two-factor.confirmed', EnsureTwoFactorIsConfigured::class);
        $router->aliasMiddleware('dos-factor.reciente', RequiereDosFactorReciente::class);

        Tenant::observe(TenantObserver::class);

        $this->configurarRateLimiters();

        // Comandos de consola propios del modulo: no hay app/Console/Kernel.php
        // en esta app (Laravel 11+), asi que cada modulo registra los suyos
        // aqui en vez de depender del autodiscovery de app/Console/Commands.
        if ($this->app->runningInConsole()) {
            $this->commands([
                ActivarLicenciaCommand::class,
                RevalidarLicenciasCommand::class,
            ]);
        }
    }

    /**
     * Por IP+correo (no solo IP): asi un intento de fuerza bruta contra
     * UNA cuenta desde varias IPs sigue limitado por cuenta, y varios
     * usuarios legitimos detras de la misma IP (oficina, NAT) no se
     * bloquean entre si.
     */
    private function configurarRateLimiters(): void
    {
        RateLimiter::for('login', function ($request) {
            $llave = Str::lower((string) $request->input('correo')).'|'.$request->ip();

            return Limit::perMinute(5)->by($llave);
        });

        RateLimiter::for('two-factor', function ($request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
