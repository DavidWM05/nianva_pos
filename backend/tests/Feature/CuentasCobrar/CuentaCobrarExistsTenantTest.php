<?php

namespace Tests\Feature\CuentasCobrar;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CuentaCobrarExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['cuentas_cobrar.registrar_abono']);
    }

    public function test_abono_rechaza_metodo_pago_de_otro_tenant(): void
    {
        $cuenta = $this->crearCuentaCobrar();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/cuentas-cobrar/{$cuenta->id}/abonos", [
            'monto' => 10,
            'metodo_pago_id' => $this->metodoPagoB->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['metodo_pago_id']);
    }

    public function test_abono_acepta_metodo_pago_global(): void
    {
        $cuenta = $this->crearCuentaCobrar();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/cuentas-cobrar/{$cuenta->id}/abonos", [
            'monto' => 10,
            'metodo_pago_id' => $this->metodoPagoGlobal->id,
        ])->assertOk();
    }
}
