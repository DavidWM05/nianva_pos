<?php

namespace Tests\Feature\Nucleo;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class UsuarioExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['usuarios.crear']);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'nombre' => 'Nuevo Usuario',
            'correo' => uniqid('nuevo-').'@test.com',
            'password' => 'password-valida-123',
        ], $overrides);
    }

    public function test_store_rechaza_sucursal_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/usuarios', $this->payload([
            'sucursal_id' => $this->sucursalB->id,
        ]))->assertStatus(422)->assertJsonValidationErrors(['sucursal_id']);
    }

    public function test_store_rechaza_rol_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/usuarios', $this->payload([
            'roles' => [$this->rolB->id],
        ]))->assertStatus(422)->assertJsonValidationErrors(['roles.0']);
    }

    public function test_store_acepta_rol_global(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/usuarios', $this->payload([
            'roles' => [$this->rolGlobal->id],
        ]))->assertCreated();
    }
}
