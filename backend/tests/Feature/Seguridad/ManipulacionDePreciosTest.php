<?php

namespace Tests\Feature\Seguridad;

use App\Modules\Inventario\Models\Compra;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ManipulacionDePreciosTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([
            'ventas.crear',
            'apartados.crear',
            'devoluciones.crear',
            'compras.crear',
        ]);
    }

    public function test_venta_ignora_precio_subtotal_total_y_costo_del_cliente(): void
    {
        $this->actingAs($this->usuario);

        $respuesta = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $this->cliente->id,
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 1,
                'subtotal' => 1,
                'total' => 1,
                'costo' => 1,
            ]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
            'subtotal' => 1,
            'total' => 1,
            'costo' => 1,
        ]);

        $respuesta->assertCreated()->assertJsonPath('data.total', '100.00');

        $venta = Venta::latest('id')->firstOrFail();
        $this->assertSame(100.0, (float) $venta->total);
        $this->assertSame(100.0, (float) VentaDetalle::where('venta_id', $venta->id)->firstOrFail()->precio_unitario);
    }

    public function test_cotizar_venta_ignora_precios_alterados(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/ventas/cotizar', [
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 1,
                'subtotal' => 1,
                'total' => 1,
                'costo' => 1,
            ]],
            'subtotal' => 1,
            'total' => 1,
            'costo' => 1,
        ])
            ->assertOk()
            ->assertJsonPath('data.items.0.precio_unitario', 100)
            ->assertJsonPath('data.subtotal', 100);
    }

    public function test_apartado_ignora_precios_alterados(): void
    {
        $this->actingAs($this->usuario);

        $respuesta = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $this->cliente->id,
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 1,
                'subtotal' => 1,
                'total' => 1,
                'costo' => 1,
            ]],
            'subtotal' => 1,
            'total' => 1,
            'costo' => 1,
        ]);

        $respuesta->assertCreated()->assertJsonPath('data.total', '100.00');
    }

    public function test_devolucion_ignora_precios_alterados_y_usa_los_de_la_venta(): void
    {
        $venta = $this->crearVenta();
        $this->actingAs($this->usuario);

        $respuesta = $this->postJson('/api/v1/devoluciones', [
            'venta_id' => $venta->id,
            'tipo' => 'devolucion',
            'items_devueltos' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 1,
                'subtotal' => 1,
                'total' => 1,
                'costo' => 1,
            ]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
            'precio_unitario' => 1,
            'subtotal' => 1,
            'total' => 1,
            'costo' => 1,
        ]);

        $respuesta->assertCreated();
        $this->assertDatabaseHas('devolucion_items', [
            'variante_id' => $this->variante->id,
            'precio_unitario' => 100,
            'subtotal' => 100,
        ]);
    }

    public function test_compra_ignora_subtotal_y_total_alterados_pero_usa_precio_compra(): void
    {
        $this->actingAs($this->usuario);

        $respuesta = $this->postJson('/api/v1/compras', [
            'proveedor_id' => $this->proveedor->id,
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 2,
                'precio_compra' => 50,
                'subtotal' => 1,
                'total' => 1,
                'costo' => 1,
            ]],
            'subtotal' => 1,
            'total' => 1,
            'costo' => 1,
        ]);

        $respuesta->assertCreated()->assertJsonPath('data.total', '100.00');
        $compra = Compra::latest('id')->firstOrFail();
        $this->assertSame(100.0, (float) $compra->total);
    }
}
