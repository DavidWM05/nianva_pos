<?php

namespace Tests\Feature\Crm;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class PlanPagoValidacionesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['ventas_plazos.crear']);
    }

    public function test_crear_plan_sobre_venta_con_plan_activo_devuelve_422_con_error_code(): void
    {
        $venta = $this->crearVenta();
        $plan = $this->crearPlan($venta);
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/ventas/{$venta->id}/plan-pago", [
            'numero_cuotas' => 2,
            'periodicidad' => 'mensual',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'plan_pago_ya_activo')
            ->assertJsonPath('venta_id', $venta->id)
            ->assertJsonPath('plan_pago_id', $plan->id);
    }

    public function test_pagar_una_cuota_ya_pagada_devuelve_422_con_error_code(): void
    {
        $venta = $this->crearVenta();
        $plan = $this->crearPlan($venta);
        $cuota = $plan->cuotas()->first();
        $cuota->update(['estado' => 'pagada']);
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/planes-pago-cliente/{$plan->id}/pagar-cuota", [
            'cuota_id' => $cuota->id,
            'monto' => $cuota->monto,
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'cuota_ya_pagada')
            ->assertJsonPath('plan_pago_id', $plan->id)
            ->assertJsonPath('cuota_id', $cuota->id);
    }

    public function test_pago_que_no_cubre_la_cuota_devuelve_422_con_error_code(): void
    {
        $venta = $this->crearVenta();
        $plan = $this->crearPlan($venta);
        $cuota = $plan->cuotas()->first();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/planes-pago-cliente/{$plan->id}/pagar-cuota", [
            'cuota_id' => $cuota->id,
            'monto' => 1,
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'pago_cuota_insuficiente')
            ->assertJsonPath('cuota_id', $cuota->id)
            ->assertJsonStructure(['message', 'error_code', 'cuota_id', 'monto_requerido', 'monto_recibido']);
    }
}
