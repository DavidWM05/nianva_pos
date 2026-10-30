<?php

namespace Tests\Feature\Apartados;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ApartadoExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['apartados.abonar']);
    }

    public function test_abono_rechaza_metodo_pago_de_otro_tenant(): void
    {
        $apartado = $this->crearApartado();
        $this->actingAs($this->usuario);

        $this->postJson("/api/apartados/{$apartado->id}/abonos", [
            'monto' => 10,
            'pagos' => [['metodo_pago_id' => $this->metodoPagoB->id, 'monto' => 10]],
        ])->assertStatus(422)->assertJsonValidationErrors(['pagos.0.metodo_pago_id']);
    }

    public function test_abono_acepta_metodo_pago_global(): void
    {
        $apartado = $this->crearApartado();
        $this->actingAs($this->usuario);

        $this->postJson("/api/apartados/{$apartado->id}/abonos", [
            'monto' => 10,
            'pagos' => [['metodo_pago_id' => $this->metodoPagoGlobal->id, 'monto' => 10]],
        ])->assertOk();
    }
}
