<?php

namespace Tests\Feature\Cotizaciones;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CotizacionExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.convertir']);
    }

    public function test_store_rechaza_cliente_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/cotizaciones', [
            'sucursal_id' => $this->sucursal->id,
            'cliente_id' => $this->clienteB->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100]],
        ])->assertStatus(422)->assertJsonValidationErrors(['cliente_id']);
    }

    public function test_store_rechaza_sucursal_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/cotizaciones', [
            'sucursal_id' => $this->sucursalB->id,
            'cliente_id' => $this->cliente->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100]],
        ])->assertStatus(422)->assertJsonValidationErrors(['sucursal_id']);
    }

    public function test_update_rechaza_cliente_de_otro_tenant(): void
    {
        $id = $this->crearCotizacion();
        $this->actingAs($this->usuario);

        $this->putJson("/api/cotizaciones/{$id}", [
            'cliente_id' => $this->clienteB->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100]],
        ])->assertStatus(422)->assertJsonValidationErrors(['cliente_id']);
    }

    public function test_convertir_rechaza_metodo_pago_de_otro_tenant(): void
    {
        $id = $this->crearCotizacion();
        $this->actingAs($this->usuario);

        $this->postJson("/api/cotizaciones/{$id}/convertir", [
            'metodo_pago_id' => $this->metodoPagoB->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['metodo_pago_id']);
    }

    public function test_convertir_acepta_metodo_pago_global(): void
    {
        $id = $this->crearCotizacion();
        $this->actingAs($this->usuario);

        $this->postJson("/api/cotizaciones/{$id}/convertir", [
            'metodo_pago_id' => $this->metodoPagoGlobal->id,
        ])->assertOk();
    }
}
