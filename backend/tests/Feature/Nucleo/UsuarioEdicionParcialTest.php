<?php

namespace Tests\Feature\Nucleo;

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
}
