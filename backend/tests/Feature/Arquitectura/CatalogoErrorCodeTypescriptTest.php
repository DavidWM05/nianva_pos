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

        $this->assertTrue(
            ErroresCatalogoCommand::contenidoEquivalente(File::get($ruta), $comando->contenidoTypescript()),
            'El TypeScript del catalogo esta desactualizado. Ejecuta php artisan errores:catalogo.',
        );
    }

    public function test_la_comparacion_ignora_el_fin_de_linea_pero_no_el_contenido(): void
    {
        $this->assertTrue(ErroresCatalogoCommand::contenidoEquivalente("a\r\nb\r\n", "a\nb\n"));
        $this->assertFalse(ErroresCatalogoCommand::contenidoEquivalente("a\r\nc\r\n", "a\nb\n"));
    }

    public function test_el_comando_check_valida_catalogo_y_typescript_sin_escribir(): void
    {
        $this->artisan('errores:catalogo', ['--check' => true])
            ->expectsOutputToContain('al dia')
            ->assertSuccessful();
    }
}
