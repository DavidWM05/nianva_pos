<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Permiso;
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

    public function test_actualizar_rol_sin_permisos_en_el_payload_conserva_sus_permisos(): void
    {
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $permisos = Permiso::factory()->count(2)->create();
        $rol->permisos()->sync($permisos->pluck('id'));
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/roles/{$rol->id}", ['nombre' => 'Renombrado'])
            ->assertOk();

        $this->assertEqualsCanonicalizing(
            $permisos->pluck('id')->all(),
            $rol->permisos()->pluck('permisos.id')->all(),
        );
    }

    public function test_actualizar_rol_con_permisos_vacios_le_quita_todos(): void
    {
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol->permisos()->sync(Permiso::factory()->count(2)->create()->pluck('id'));
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/roles/{$rol->id}", ['nombre' => $rol->nombre, 'permisos' => []])
            ->assertOk();

        $this->assertSame(0, $rol->permisos()->count());
    }

    public function test_actualizar_rol_con_permisos_en_null_le_quita_todos(): void
    {
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol->permisos()->sync(Permiso::factory()->count(2)->create()->pluck('id'));
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/roles/{$rol->id}", ['nombre' => $rol->nombre, 'permisos' => null])
            ->assertOk();

        $this->assertSame(0, $rol->permisos()->count());
    }
}
