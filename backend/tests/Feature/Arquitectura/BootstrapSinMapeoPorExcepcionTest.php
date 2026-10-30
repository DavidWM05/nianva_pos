<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use Tests\TestCase;

class BootstrapSinMapeoPorExcepcionTest extends TestCase
{
    public function test_bootstrap_solo_referencia_excepcion_negocio(): void
    {
        $contenido = file_get_contents(base_path('bootstrap/app.php'));

        preg_match_all('/App\\\\Modules\\\\[A-Za-z]+\\\\Exceptions\\\\[A-Za-z]+/', $contenido, $coincidencias);

        $this->assertNotEmpty($coincidencias[0], 'bootstrap/app.php debe registrar el manejador de ExcepcionNegocio.');

        foreach ($coincidencias[0] as $clase) {
            $this->assertSame(
                ExcepcionNegocio::class,
                $clase,
                "bootstrap/app.php no debe nombrar excepciones concretas: {$clase}.",
            );
        }
    }
}
