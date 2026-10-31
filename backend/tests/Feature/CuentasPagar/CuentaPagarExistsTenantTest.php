<?php

namespace Tests\Feature\CuentasPagar;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CuentaPagarExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['cuentas_pagar.registrar_pago']);
    }

    private function crearCuentaPagar(): CuentaPagar
    {
        return CuentaPagar::create([
            'tenant_id' => $this->tenant->id,
            'compra_id' => $this->compra->id,
            'proveedor_id' => $this->proveedor->id,
            'monto_total' => 100,
            'saldo_pendiente' => 100,
            'fecha_vencimiento' => now()->addDays(30)->toDateString(),
            'estado' => 'pendiente',
        ]);
    }

    public function test_pago_rechaza_metodo_pago_de_otro_tenant(): void
    {
        $cuenta = $this->crearCuentaPagar();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/cuentas-pagar/{$cuenta->id}/pagos", [
            'monto' => 10,
            'metodo_pago_id' => $this->metodoPagoB->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['metodo_pago_id']);
    }

    public function test_pago_acepta_metodo_pago_global(): void
    {
        $cuenta = $this->crearCuentaPagar();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/cuentas-pagar/{$cuenta->id}/pagos", [
            'monto' => 10,
            'metodo_pago_id' => $this->metodoPagoGlobal->id,
        ])->assertOk();
    }
}
