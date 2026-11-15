<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Factories\Factory;
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
        Factory::guessFactoryNamesUsing($this->factoryDe(...));

        // Fuera de produccion, Eloquent no falla en silencio (DAT-14):
        // - un campo mass-assigned que no esta en el #[Fillable] revienta con
        //   MassAssignmentException en vez de descartarse (bug real de
        //   VentasPlazosService: migracion nueva, Fillable viejo, 201 con
        //   datos incompletos);
        // - una relacion no precargada en una coleccion revienta con
        //   LazyLoadingViolationException (N+1, API-06);
        // - leer un atributo no seleccionado revienta con
        //   MissingAttributeException en vez de devolver null.
        Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
        Model::preventLazyLoading(! app()->isProduction());
        Model::preventAccessingMissingAttributes(! app()->isProduction());
    }

    /**
     * @param  class-string<Model>  $model
     * @return class-string<Factory<Model>>
     */
    private function factoryDe(string $model): string
    {
        $factory = str_replace('\\Models\\', '\\Database\\Factories\\', $model).'Factory';

        if (! class_exists($factory) || ! is_subclass_of($factory, Factory::class)) {
            throw new \RuntimeException("No existe la factory {$factory}.");
        }

        return $factory;
    }
}
