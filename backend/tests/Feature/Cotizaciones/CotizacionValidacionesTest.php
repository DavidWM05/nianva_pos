<?php

namespace Tests\Feature\Cotizaciones;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CotizacionValidacionesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['cotizaciones.crear', 'cotizaciones.editar']);
    }

    public function test_cotizacion_con_variante_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/cotizaciones', [
            'sucursal_id' => $this->sucursal->id,
            'items' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1, 'precio_unitario' => 100]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.variante_id']);
    }

    public function test_cotizacion_con_total_negativo_devuelve_422_con_error_code(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/cotizaciones', [
            'sucursal_id' => $this->sucursal->id,
            'descuento' => 200,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100]],
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'cotizacion_total_negativo')
            ->assertJsonStructure(['message', 'error_code', 'subtotal', 'descuento']);
    }

    public function test_actualizar_cotizacion_con_variante_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $id = $this->crearCotizacion();
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/cotizaciones/{$id}", [
            'items' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1, 'precio_unitario' => 100]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.variante_id']);
    }

    public function test_actualizar_cotizacion_con_total_negativo_devuelve_422_con_error_code(): void
    {
        $id = $this->crearCotizacion();
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/cotizaciones/{$id}", [
            'descuento' => 200,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100]],
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'cotizacion_total_negativo')
            ->assertJsonStructure(['message', 'error_code', 'subtotal', 'descuento']);
    }
}
