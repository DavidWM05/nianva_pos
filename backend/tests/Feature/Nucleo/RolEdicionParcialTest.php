<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Rol;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class RolEdicionParcialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['roles.editar']);
    }

    public function test_actualizar_rol_solo_con_nombre_conserva_la_descripcion(): void
    {
        $rol = Rol::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Cajero',
            'descripcion' => 'Descripcion original',
            'es_sistema' => false,
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/roles/{$rol->id}", ['nombre' => 'Cajero actualizado'])
            ->assertOk();

        $rol->refresh();
        $this->assertSame('Cajero actualizado', $rol->nombre);
        $this->assertSame('Descripcion original', $rol->descripcion);
    }
}
