<?php

namespace Tests\Feature\Precios;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ReglaPrecioExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['reglas_precio.crear', 'reglas_precio.editar']);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'nombre' => 'Regla de prueba',
            'tipo' => 'porcentaje',
            'valor' => 10,
            'aplica_a' => 'todo',
        ], $overrides);
    }

    public function test_rechaza_categoria_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/reglas-precio', $this->payload(['categoria_id' => $this->categoriaB->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['categoria_id']);
    }

    public function test_rechaza_producto_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/reglas-precio', $this->payload(['producto_id' => $this->productoB->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['producto_id']);
    }

    public function test_rechaza_variante_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/reglas-precio', $this->payload(['variante_id' => $this->varianteB->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['variante_id']);
    }
}
