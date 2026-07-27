<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\InstalacionNucleo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstalacionNucleoTest extends TestCase
{
    use RefreshDatabase;

    public function test_genera_el_identificador_la_primera_vez_y_lo_reutiliza_despues(): void
    {
        $primero = InstalacionNucleo::identificador();
        $segundo = InstalacionNucleo::identificador();

        $this->assertSame($primero, $segundo);
        $this->assertDatabaseCount('instalacion_nucleo', 1);
    }
}
