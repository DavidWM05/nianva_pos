<?php

namespace Tests\Feature\Aplicacion;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class RegistrarDevolucionAtomicidadTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['devoluciones.crear']);
    }

    public function test_si_falla_la_nota_de_credito_no_queda_devolucion_ni_movimiento_de_stock(): void
    {
        $venta = $this->crearVenta();

        $stockAntes = (float) InventarioStock::where('variante_id', $this->variante->id)
            ->firstOrFail()
            ->stock_actual;

        $this->mock(NotaCreditoService::class, function (MockInterface $mock) {
            $mock->shouldReceive('crearDesdeDevolucion')
                ->once()
                ->andThrow(new \RuntimeException('Fallo simulado al crear la nota de credito.'));
        });

        $this->actingAs($this->usuario);

        $this->postJson('/api/devoluciones', [
            'venta_id' => $venta->id,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
            'tipo_reembolso' => 'nota_credito',
        ])->assertStatus(500);

        $this->assertSame(0, Devolucion::count());
        $this->assertSame($stockAntes, (float) InventarioStock::where('variante_id', $this->variante->id)->firstOrFail()->stock_actual);
    }
}
