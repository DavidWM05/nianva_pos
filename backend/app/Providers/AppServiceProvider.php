<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Fuera de produccion: un campo mass-assigned que no esta en el
        // #[Fillable] del modelo revienta con MassAssignmentException en vez
        // de descartarse en silencio (ver el bug real de VentasPlazosService,
        // donde una migracion agrego columnas y nadie actualizo el Fillable
        // -- el request respondia 201 con datos incompletos, sin error).
        Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
    }
}
