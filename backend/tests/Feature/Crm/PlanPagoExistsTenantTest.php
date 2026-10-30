<?php

namespace Tests\Feature\Crm;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class PlanPagoExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['ventas_plazos.crear']);
    }

    public function test_pagar_cuota_rechaza_cuota_de_otro_tenant(): void
    {
        $venta = $this->crearVenta();
        $plan = $this->crearPlan($venta);
        $this->actingAs($this->usuario);

        $this->postJson("/api/planes-pago-cliente/{$plan->id}/pagar-cuota", [
            'cuota_id' => $this->cuotaB->id,
            'monto' => 50,
        ])->assertStatus(422)->assertJsonValidationErrors(['cuota_id']);
    }
}
