<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class UsuarioEdicionParcialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['usuarios.editar']);
    }

    public function test_actualizar_usuario_sin_campos_opcionales_conserva_sus_valores_y_password(): void
    {
        $objetivo = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Carlos',
            'apellido' => 'Ruiz',
            'correo' => 'carlos.edicion@test.com',
            'telefono' => '555-1234',
            'password' => 'password-original-123',
        ]);
        $hashOriginal = $objetivo->password;

        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/usuarios/{$objetivo->id}", [
            'nombre' => 'Carlos Actualizado',
            'correo' => 'carlos.edicion@test.com',
        ])->assertOk();

        $objetivo->refresh();
        $this->assertSame('Carlos Actualizado', $objetivo->nombre);
        $this->assertSame('Ruiz', $objetivo->apellido);
        $this->assertSame('555-1234', $objetivo->telefono);
        $this->assertSame($hashOriginal, $objetivo->password);
    }

    public function test_actualizar_usuario_sin_roles_en_el_payload_conserva_sus_roles(): void
    {
        $objetivo = Usuario::factory()->create(['tenant_id' => $this->tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        $objetivo->roles()->sync([$rol->id]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/usuarios/{$objetivo->id}", [
            'nombre' => 'Renombrado',
            'correo' => $objetivo->correo,
        ])->assertOk();

        $this->assertSame([$rol->id], $objetivo->roles()->pluck('roles.id')->all());
    }

    public function test_actualizar_usuario_con_roles_vacios_le_quita_todos(): void
    {
        $objetivo = Usuario::factory()->create(['tenant_id' => $this->tenant->id]);
        $objetivo->roles()->sync([Rol::factory()->create(['tenant_id' => $this->tenant->id])->id]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/usuarios/{$objetivo->id}", [
            'nombre' => $objetivo->nombre,
            'correo' => $objetivo->correo,
            'roles' => [],
        ])->assertOk();

        $this->assertSame(0, $objetivo->roles()->count());
    }
}
