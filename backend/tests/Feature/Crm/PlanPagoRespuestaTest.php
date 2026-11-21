<?php

declare(strict_types=1);

namespace Tests\Feature\Crm;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * ARQ-12b: crear un plan de pago responde con PlanPagoResource, la misma forma que el detalle,
 * y no con el modelo crudo (tenant_id, cliente_id, periodicidad sin enum en el contrato).
 */
class PlanPagoRespuestaTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['ventas_plazos.crear']);
    }

    public function test_crear_un_plan_responde_con_el_resource_del_plan(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/ventas/{$venta->ulid}/plan-pago", ['numero_cuotas' => 2, 'periodicidad' => 'mensual'])
            ->assertCreated()
            ->assertJsonPath('data.venta_id', $venta->ulid)
            ->assertJsonPath('data.periodicidad', 'mensual')
            ->assertJsonPath('data.numero_cuotas', 2)
            ->assertJsonMissingPath('data.tenant_id')
            ->assertJsonMissingPath('data.cliente_id');
    }
}
