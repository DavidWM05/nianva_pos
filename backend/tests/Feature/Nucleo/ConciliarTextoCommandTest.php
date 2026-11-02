<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConciliarTextoCommandTest extends TestCase
{
    use RefreshDatabase;

    private function crearCategoria(string $nombre): void
    {
        $tenant = Tenant::create(['nombre' => 'Tenant Texto', 'pais' => 'MX', 'activo' => true]);
        Categoria::create(['tenant_id' => $tenant->id, 'nombre' => $nombre]);
    }

    public function test_reporta_doble_codificacion_y_sale_con_1(): void
    {
        $nombre = 'categor'.chr(0xC3).chr(0x83).chr(0xC2).chr(0xAD).'a';
        $this->crearCategoria($nombre);

        $this->artisan('conciliar:texto')
            ->expectsOutputToContain('categorias.nombre')
            ->assertExitCode(1);
    }

    public function test_sale_con_0_si_la_base_esta_limpia(): void
    {
        $this->crearCategoria('Ropa');

        $this->artisan('conciliar:texto')
            ->assertExitCode(0);
    }
}
