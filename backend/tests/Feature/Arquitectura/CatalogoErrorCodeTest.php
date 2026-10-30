<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Nucleo\Exceptions\LicenciaActivacionFallidaException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ReflectionClass;
use Tests\TestCase;

class CatalogoErrorCodeTest extends TestCase
{
    /**
     * Excepciones fuera del contrato de negocio, con su motivo.
     *
     * @var array<class-string, string>
     */
    private const EXCEPCIONES_EXCLUIDAS = [
        ExcepcionNegocio::class => 'Clase base abstracta.',
        LicenciaActivacionFallidaException::class => 'Solo se lanza desde licencia:activar (CLI), nunca desde un Controller.',
    ];

    public function test_toda_excepcion_de_negocio_declara_un_error_code_unico_en_snake_case(): void
    {
        $codigos = [];

        foreach ($this->clasesDeExcepciones() as $clase) {
            if (isset(self::EXCEPCIONES_EXCLUIDAS[$clase])) {
                continue;
            }

            $reflejo = new ReflectionClass($clase);

            $this->assertTrue(
                $reflejo->isSubclassOf(ExcepcionNegocio::class),
                "{$clase} debe extender ExcepcionNegocio.",
            );

            $excepcion = $reflejo->newInstanceWithoutConstructor();
            $codigo = $excepcion->errorCode();

            $this->assertMatchesRegularExpression(
                '/^[a-z][a-z0-9_]*$/',
                $codigo,
                "El error_code de {$clase} no esta en snake_case.",
            );

            $this->assertNotContains(
                $codigo,
                $codigos,
                "El error_code '{$codigo}' esta repetido (ultima clase: {$clase}).",
            );

            $codigos[] = $codigo;
        }

        $this->assertNotEmpty($codigos);
        $this->assertSame(count($codigos), count(array_unique($codigos)));
    }

    /**
     * @return list<class-string>
     */
    private function clasesDeExcepciones(): array
    {
        $clases = [];

        foreach (File::allFiles(app_path('Modules')) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            if (! str_contains($archivo->getPathname(), DIRECTORY_SEPARATOR.'Exceptions'.DIRECTORY_SEPARATOR)) {
                continue;
            }

            $relativo = Str::after($archivo->getPathname(), app_path().DIRECTORY_SEPARATOR);
            $clase = 'App\\'.str_replace(['/', '\\'], '\\', Str::beforeLast($relativo, '.php'));

            if (class_exists($clase)) {
                $clases[] = $clase;
            }
        }

        sort($clases);

        return $clases;
    }
}
