<?php

namespace Tests\Feature\Cotizaciones;

use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaPago;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CotizacionPrecioManualTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([
            'cotizaciones.ver',
            'cotizaciones.crear',
            'cotizaciones.editar',
            'cotizaciones.convertir',
        ]);
    }

    private function payload(array $item = []): array
    {
        return [
            'sucursal_id' => $this->sucursal->id,
            'cliente_id' => $this->cliente->id,
            'items' => [array_merge([
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
            ], $item)],
        ];
    }

    public function test_sin_permiso_ignora_precio_y_descuento_alterados(): void
    {
        $this->actingAs($this->usuario);

        $respuesta = $this->postJson('/api/v1/cotizaciones', $this->payload([
            'precio_unitario' => 999,
            'descuento' => 50,
            'subtotal' => 1,
            'total' => 1,
        ]));

        $respuesta->assertCreated()
            ->assertJsonPath('data.total', '100.00')
            ->assertJsonPath('data.detalles.0.precio_unitario', '100.00')
            ->assertJsonPath('data.detalles.0.descuento', '0.00');
    }

    public function test_con_permiso_respeta_precio_y_descuento_del_cliente(): void
    {
        $this->darPermisosA($this->usuario, ['cotizaciones.precio_manual']);
        $this->actingAs($this->usuario);

        $respuesta = $this->postJson('/api/v1/cotizaciones', $this->payload([
            'precio_unitario' => 999,
            'descuento' => 50,
        ]));

        $respuesta->assertCreated()
            ->assertJsonPath('data.total', '949.00')
            ->assertJsonPath('data.detalles.0.precio_unitario', '999.00')
            ->assertJsonPath('data.detalles.0.descuento', '50.00');
    }

    public function test_put_sin_permiso_ignora_precio_y_descuento_alterados(): void
    {
        $this->actingAs($this->usuario);

        $id = $this->postJson('/api/v1/cotizaciones', $this->payload())->assertCreated()->json('data.id');

        $this->putJson("/api/v1/cotizaciones/{$id}", [
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 999,
                'descuento' => 50,
            ]],
        ])
            ->assertOk()
            ->assertJsonPath('data.total', '100.00')
            ->assertJsonPath('data.detalles.0.precio_unitario', '100.00');
    }

    public function test_con_permiso_sin_precio_usa_el_del_sistema(): void
    {
        $this->darPermisosA($this->usuario, ['cotizaciones.precio_manual']);
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/cotizaciones', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.total', '100.00')
            ->assertJsonPath('data.detalles.0.precio_unitario', '100.00');
    }

    public function test_meta_permisos_incluye_precio_manual_en_listado_y_detalle(): void
    {
        $this->darPermisosA($this->usuario, ['cotizaciones.precio_manual']);
        $this->actingAs($this->usuario);

        $creada = $this->postJson('/api/v1/cotizaciones', $this->payload())->assertCreated();
        $id = $creada->json('data.id');

        $this->getJson('/api/v1/cotizaciones')
            ->assertOk()
            ->assertJsonPath('meta.permisos.precio_manual', true);

        $this->getJson("/api/v1/cotizaciones/{$id}")
            ->assertOk()
            ->assertJsonPath('meta.permisos.precio_manual', true);
    }

    public function test_conversion_a_venta_usa_el_precio_del_sistema_y_el_pago_cuadra(): void
    {
        $this->darPermisosA($this->usuario, ['cotizaciones.precio_manual']);
        $this->actingAs($this->usuario);

        $cotizacion = $this->postJson('/api/v1/cotizaciones', $this->payload([
            'precio_unitario' => 999,
            'descuento' => 0,
        ]))->assertCreated()->json('data');

        $this->postJson("/api/v1/cotizaciones/{$cotizacion['id']}/convertir", [
            'metodo_pago_id' => $this->metodoPago->id,
        ])->assertOk();

        $venta = Venta::latest('id')->firstOrFail();
        $this->assertSame(100.0, (float) $venta->total);
        $this->assertSame(100.0, (float) VentaPago::where('venta_id', $venta->id)->sum('monto'));
    }
}
