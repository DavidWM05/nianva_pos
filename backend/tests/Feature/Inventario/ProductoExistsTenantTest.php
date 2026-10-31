<?php

namespace Tests\Feature\Inventario;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ProductoExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['inventario.crear']);
    }

    public function test_producto_rechaza_categoria_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/productos', [
            'nombre' => 'Producto',
            'categoria_id' => $this->categoriaB->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['categoria_id']);
    }

    public function test_producto_rechaza_departamento_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/productos', [
            'nombre' => 'Producto',
            'departamento_id' => $this->departamentoB->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['departamento_id']);
    }
}
