<?php

namespace Tests\Feature\Inventario;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CompraValidacionesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['compras.crear']);
    }

    public function test_compra_con_variante_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/compras', [
            'proveedor_id' => $this->proveedor->id,
            'items' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1, 'precio_compra' => 50]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.variante_id']);
    }

    public function test_compra_con_proveedor_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/compras', [
            'proveedor_id' => $this->proveedorB->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_compra' => 50]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['proveedor_id']);
    }
}
