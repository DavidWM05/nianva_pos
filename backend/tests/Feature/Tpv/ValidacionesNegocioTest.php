<?php

namespace Tests\Feature\Tpv;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ValidacionesNegocioTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['caja.cerrar', 'ventas.crear', 'ventas.anular']);
    }

    public function test_cerrar_dos_veces_la_caja_devuelve_422_con_error_code(): void
    {
        $this->actingAs($this->usuario);

        $this->patchJson("/api/caja/{$this->caja->id}/cerrar", ['monto_fisico' => 500])->assertOk();

        $this->patchJson("/api/caja/{$this->caja->id}/cerrar", ['monto_fisico' => 500])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'caja_ya_cerrada')
            ->assertJsonPath('caja_sesion_id', $this->caja->id);
    }

    public function test_venta_con_total_negativo_devuelve_422_con_error_code(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/ventas', $this->payloadVenta(['descuento_manual' => 200]))
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'venta_total_negativo')
            ->assertJsonStructure(['message', 'error_code', 'subtotal', 'descuento_manual', 'descuento_cupon']);
    }

    public function test_anular_una_venta_ya_anulada_devuelve_422_con_error_code(): void
    {
        $venta = $this->crearVenta();
        $venta->update(['estado' => 'anulada']);
        $this->actingAs($this->usuario);

        $this->patchJson("/api/ventas/{$venta->id}/anular", ['motivo' => 'prueba'])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'venta_ya_anulada')
            ->assertJsonPath('venta_id', $venta->id);
    }

    public function test_venta_con_variante_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $payload = $this->payloadVenta([
            'items' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1]],
        ]);

        $this->postJson('/api/ventas', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.variante_id']);
    }

    public function test_cotizar_con_variante_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/ventas/cotizar', [
            'items' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1]],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.variante_id']);
    }

    public function test_venta_con_cliente_de_otro_tenant_devuelve_422_de_validacion(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/ventas', $this->payloadVenta(['cliente_id' => $this->clienteB->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cliente_id']);
    }
}
