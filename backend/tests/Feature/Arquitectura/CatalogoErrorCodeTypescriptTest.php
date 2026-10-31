<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Console\Commands\ErroresCatalogoCommand;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class CatalogoErrorCodeTypescriptTest extends TestCase
{
    public function test_el_typescript_del_catalogo_esta_al_dia(): void
    {
        $ruta = dirname(base_path()).'/frontend/libs/ui-shared/src/lib/errores/codigos-error.ts';

        $this->assertFileExists($ruta);

        $comando = new ErroresCatalogoCommand;

        $this->assertSame(
            $comando->contenidoTypescript(),
            File::get($ruta),
            'El TypeScript del catalogo esta desactualizado. Ejecuta php artisan errores:catalogo.',
        );
    }

    public function test_el_comando_check_valida_catalogo_y_typescript_sin_escribir(): void
    {
        $this->artisan('errores:catalogo', ['--check' => true])
            ->expectsOutputToContain('al dia')
            ->assertSuccessful();
    }
}
