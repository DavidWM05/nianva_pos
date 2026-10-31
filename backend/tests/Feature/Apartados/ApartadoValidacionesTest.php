<?php

namespace Tests\Feature\Apartados;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ApartadoValidacionesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['apartados.crear']);
    }

    public function test_apartado_con_variante_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/apartados', [
            'cliente_id' => $this->cliente->id,
            'items' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.variante_id']);
    }

    public function test_apartado_con_cliente_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/apartados', [
            'cliente_id' => $this->clienteB->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cliente_id']);
    }
}
