<?php

namespace Tests\Feature\Devoluciones;

use App\Modules\Nucleo\Support\AccionSupervisor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AutorizaOperaciones;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class DevolucionExistsTenantTest extends TestCase
{
    use AutorizaOperaciones;
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['devoluciones.crear']);
    }

    public function test_rechaza_venta_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/devoluciones', [
            'venta_id' => $this->ventaB->ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors(['venta_id']);
    }

    public function test_rechaza_variante_devuelta_de_otro_tenant(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/devoluciones', [
            'venta_id' => $venta->ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors(['items_devueltos.0.variante_id']);
    }

    public function test_rechaza_variante_nueva_de_otro_tenant(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/devoluciones', [
            'venta_id' => $venta->ulid,
            'tipo' => 'cambio',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'items_nuevos' => [['variante_id' => $this->varianteB->id, 'cantidad' => 1]],
        ])->assertStatus(422)->assertJsonValidationErrors(['items_nuevos.0.variante_id']);
    }

    public function test_rechaza_metodo_pago_de_otro_tenant(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/devoluciones', [
            'venta_id' => $venta->ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $this->metodoPagoB->id, 'monto' => 100]],
        ])->assertStatus(422)->assertJsonValidationErrors(['pagos.0.metodo_pago_id']);
    }

    public function test_acepta_metodo_pago_global(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $datosSupervisor1 = [
            'venta_id' => $venta->ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $this->metodoPagoGlobal->id, 'monto' => 100]],
        ];
        $this->seleccionarTerminalDeCaja();
        $this->postJson('/api/v1/devoluciones', $datosSupervisor1, ['X-Autorizacion-Supervisor' => self::conSupervisor($this->usuario, AccionSupervisor::Reembolsar, $datosSupervisor1, $venta->ulid, sesionHash: hash('sha256', session()->getId()))->token])->assertCreated();
    }
}
