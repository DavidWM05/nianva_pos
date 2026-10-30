<?php

namespace Tests\Feature\Devoluciones;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class DevolucionValidacionesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['devoluciones.crear']);
    }

    public function test_devolucion_con_items_nuevos_devuelve_422_de_validacion(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson('/api/devoluciones', [
            'venta_id' => $venta->id,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'items_nuevos' => [['variante_id' => $this->varianteExtra->id, 'cantidad' => 1]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items_nuevos']);
    }

    public function test_cambio_sin_items_nuevos_devuelve_422_de_validacion(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson('/api/devoluciones', [
            'venta_id' => $venta->id,
            'tipo' => 'cambio',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items_nuevos']);
    }

    public function test_variante_fuera_de_la_venta_devuelve_422_con_error_code(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson('/api/devoluciones', [
            'venta_id' => $venta->id,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->varianteExtra->id, 'cantidad' => 1]],
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'devolucion_variante_no_vendida')
            ->assertJsonPath('venta_id', $venta->id)
            ->assertJsonPath('variante_id', $this->varianteExtra->id);
    }

    public function test_cantidad_devuelta_mayor_a_lo_vendido_devuelve_422_con_error_code(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson('/api/devoluciones', [
            'venta_id' => $venta->id,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 100]],
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'devolucion_excede_cantidad_vendida')
            ->assertJsonPath('venta_id', $venta->id)
            ->assertJsonPath('variante_id', $this->variante->id)
            ->assertJsonPath('solicitado', 100)
            ->assertJsonPath('vendido', 1);
    }
}
