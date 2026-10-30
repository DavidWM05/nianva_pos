<?php

namespace Tests\Feature\Tpv;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class VentaExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['ventas.crear']);
    }

    public function test_venta_rechaza_metodo_pago_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/ventas', $this->payloadVenta([
            'pagos' => [['metodo_pago_id' => $this->metodoPagoB->id, 'monto' => 100]],
        ]))->assertStatus(422)->assertJsonValidationErrors(['pagos.0.metodo_pago_id']);
    }

    public function test_venta_acepta_metodo_pago_global(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/ventas', $this->payloadVenta([
            'pagos' => [['metodo_pago_id' => $this->metodoPagoGlobal->id, 'monto' => 100]],
        ]))->assertCreated();
    }

    public function test_venta_rechaza_nota_credito_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/ventas', $this->payloadVenta([
            'nota_credito_id' => $this->notaCreditoB->id,
        ]))->assertStatus(422)->assertJsonValidationErrors(['nota_credito_id']);
    }
}
