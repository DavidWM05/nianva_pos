<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Models\RolPermiso;
use App\Modules\Nucleo\Models\UsuarioRol;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class FactoriesTest extends TestCase
{
    /**
     * Pivotes: se usan con attach() desde sus relaciones, no con factory.
     *
     * @var array<class-string, string>
     */
    private const SIN_FACTORY = [
        RolPermiso::class => 'Pivote de rol_permisos; se usa con attach().',
        UsuarioRol::class => 'Pivote de usuario_roles; se usa con attach().',
    ];

    /**
     * Modelos de las extensiones que se fabrican en el lote 2. Esta lista
     * solo baja: si uno ya tiene factory, el test falla.
     *
     * @var array<class-string, string>
     */
    private const PENDIENTES = [];

    public function test_los_modelos_base_tienen_factory_y_has_factory(): void
    {
        $infracciones = [];

        foreach (File::allFiles(app_path('Modules')) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            $ruta = str_replace('\\', '/', Str::after($archivo->getPathname(), app_path().DIRECTORY_SEPARATOR));

            if (! str_contains($ruta, '/Models/')) {
                continue;
            }

            $clase = 'App\\'.str_replace(['/', '\\'], '\\', Str::beforeLast($ruta, '.php'));

            if (! class_exists($clase)) {
                continue;
            }

            if (array_key_exists($clase, self::SIN_FACTORY)) {
                continue;
            }

            $factory = str_replace('\\Models\\', '\\Database\\Factories\\', $clase).'Factory';
            $tieneFactory = class_exists($factory);

            if (array_key_exists($clase, self::PENDIENTES)) {
                if ($tieneFactory) {
                    $infracciones[] = "{$clase}: ya tiene factory; quitar de PENDIENTES.";
                }

                continue;
            }

            if (! in_array(HasFactory::class, class_uses_recursive($clase), true)) {
                $infracciones[] = "{$clase}: no usa HasFactory.";
            }

            if (! $tieneFactory) {
                $infracciones[] = "{$clase}: no existe {$factory}.";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }
}
