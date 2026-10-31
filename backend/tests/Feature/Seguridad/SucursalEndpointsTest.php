<?php

namespace Tests\Feature\Seguridad;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Payroll\Models\Empleado;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class SucursalEndpointsTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private Sucursal $sucursalExtra;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([
            'cotizaciones.crear',
            'pedidos.crear',
            'produccion.crear',
            'payroll.crear',
            'reportes.ver',
        ]);
        $this->sucursalExtra = Sucursal::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Norte A',
        ]);
    }

    public function test_cotizacion_sin_todas_rechaza_otra_sucursal_y_no_guarda(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/cotizaciones', $this->payloadCotizacion($this->sucursalExtra->id))
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'sucursal_no_permitida')
            ->assertJsonPath('sucursal_id', $this->sucursalExtra->id);

        $this->assertSame(0, Cotizacion::count());
    }

    public function test_cotizacion_sin_sucursal_se_guarda_en_la_del_usuario(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/cotizaciones', $this->payloadCotizacion())
            ->assertCreated();

        $cotizacion = Cotizacion::latest('id')->firstOrFail();
        $this->assertSame($this->sucursal->id, $cotizacion->sucursal_id);
    }

    public function test_cotizacion_con_todas_se_guarda_en_la_sucursal_solicitada(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/cotizaciones', $this->payloadCotizacion($this->sucursalExtra->id))
            ->assertCreated();

        $cotizacion = Cotizacion::latest('id')->firstOrFail();
        $this->assertSame($this->sucursalExtra->id, $cotizacion->sucursal_id);
    }

    public function test_pedido_sin_todas_rechaza_otra_sucursal_y_no_guarda(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/pedidos', $this->payloadPedido($this->sucursalExtra->id))
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'sucursal_no_permitida')
            ->assertJsonPath('sucursal_id', $this->sucursalExtra->id);

        $this->assertSame(0, Pedido::count());
    }

    public function test_pedido_sin_sucursal_se_guarda_en_la_del_usuario(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/pedidos', $this->payloadPedido())
            ->assertCreated();

        $pedido = Pedido::latest('id')->firstOrFail();
        $this->assertSame($this->sucursal->id, $pedido->sucursal_id);
    }

    public function test_pedido_con_todas_se_guarda_en_la_sucursal_solicitada(): void
    {
        $this->darPermisosA($this->usuario, ['sucursales.todas']);
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/pedidos', $this->payloadPedido($this->sucursalExtra->id))
            ->assertCreated();

        $pedido = Pedido::latest('id')->firstOrFail();
        $this->assertSame($this->sucursalExtra->id, $pedido->sucursal_id);
    }

    public function test_insumo_stock_sin_todas_rechaza_otra_sucursal_y_no_guarda(): void
    {
        $insumo = $this->crearInsumo();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/insumos/{$insumo->id}/stocks", [
            'sucursal_id' => $this->sucursalExtra->id,
            'cantidad' => 1,
            'lote' => 'LOTE-RECHAZADO',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'sucursal_no_permitida')
            ->assertJsonPath('sucursal_id', $this->sucursalExtra->id);

        $this->assertSame(0, InsumoStock::where('insumo_id', $insumo->id)->count());
    }

    public function test_insumo_stock_sin_sucursal_se_guarda_en_la_del_usuario(): void
    {
        $insumo = $this->crearInsumo();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/insumos/{$insumo->id}/stocks", [
            'cantidad' => 1,
            'lote' => 'LOTE-PROPIO',
        ])->assertCreated();

        $this->assertTrue(InsumoStock::where('insumo_id', $insumo->id)
            ->where('sucursal_id', $this->sucursal->id)
            ->where('lote', 'LOTE-PROPIO')
            ->exists());
    }

    public function test_insumo_stock_con_todas_se_guarda_en_la_sucursal_solicitada(): void
    {
        $insumo = $this->crearInsumo();
        $this->darPermisosA($this->usuario, ['sucursales.todas']);
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/insumos/{$insumo->id}/stocks", [
            'sucursal_id' => $this->sucursalExtra->id,
            'cantidad' => 1,
            'lote' => 'LOTE-EXTRA',
        ])->assertCreated();

        $this->assertTrue(InsumoStock::where('insumo_id', $insumo->id)
            ->where('sucursal_id', $this->sucursalExtra->id)
            ->where('lote', 'LOTE-EXTRA')
            ->exists());
    }

    public function test_nomina_sin_todas_rechaza_otra_sucursal_y_no_guarda(): void
    {
        $this->crearEmpleado($this->sucursalExtra);
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/nominas/generar', $this->payloadNomina($this->sucursalExtra->id))
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'sucursal_no_permitida')
            ->assertJsonPath('sucursal_id', $this->sucursalExtra->id);

        $this->assertSame(0, Nomina::count());
    }

    public function test_nomina_sin_sucursal_se_genera_en_la_del_usuario(): void
    {
        $this->crearEmpleado($this->sucursal);
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/nominas/generar', $this->payloadNomina())
            ->assertCreated();

        $nomina = Nomina::latest('id')->firstOrFail();
        $this->assertSame($this->sucursal->id, $nomina->sucursal_id);
    }

    public function test_nomina_con_todas_se_genera_en_la_sucursal_solicitada(): void
    {
        $this->crearEmpleado($this->sucursalExtra);
        $this->darPermisosA($this->usuario, ['sucursales.todas']);
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/nominas/generar', $this->payloadNomina($this->sucursalExtra->id))
            ->assertCreated();

        $nomina = Nomina::latest('id')->firstOrFail();
        $this->assertSame($this->sucursalExtra->id, $nomina->sucursal_id);
    }

    public function test_reporte_sin_todas_ignora_el_filtro_de_otra_sucursal(): void
    {
        $this->crearVentaEn($this->sucursal, 100);
        $this->crearVentaEn($this->sucursalExtra, 200);
        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/ventas/reporte?sucursal_id='.$this->sucursalExtra->id);

        $response->assertOk();
        $this->assertEquals(100.0, $response->json('data.total_ventas'));
        $this->assertSame(1, $response->json('data.numero_ventas'));
        $this->assertSame($this->sucursal->id, $response->json('data.por_sucursal.0.sucursal_id'));
        $this->assertCount(1, $response->json('data.por_sucursal'));
    }

    public function test_reporte_con_todas_respeta_el_filtro_de_sucursal(): void
    {
        $this->crearVentaEn($this->sucursal, 100);
        $this->crearVentaEn($this->sucursalExtra, 200);
        $this->darPermisosA($this->usuario, ['sucursales.todas']);
        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/ventas/reporte?sucursal_id='.$this->sucursalExtra->id);

        $response->assertOk();
        $this->assertEquals(200.0, $response->json('data.total_ventas'));
        $this->assertSame(1, $response->json('data.numero_ventas'));
        $this->assertSame($this->sucursalExtra->id, $response->json('data.por_sucursal.0.sucursal_id'));
        $this->assertCount(1, $response->json('data.por_sucursal'));
    }

    public function test_reporte_con_todas_sin_parametro_incluye_todas_las_sucursales(): void
    {
        $this->crearVentaEn($this->sucursal, 100);
        $this->crearVentaEn($this->sucursalExtra, 200);
        $this->darPermisosA($this->usuario, ['sucursales.todas']);
        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/ventas/reporte');

        $response->assertOk();
        $this->assertEquals(300.0, $response->json('data.total_ventas'));
        $this->assertSame(2, $response->json('data.numero_ventas'));
        $this->assertCount(2, $response->json('data.por_sucursal'));
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadCotizacion(?int $sucursalId = null): array
    {
        $payload = [
            'cliente_id' => $this->cliente->id,
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 100,
            ]],
        ];

        if ($sucursalId !== null) {
            $payload['sucursal_id'] = $sucursalId;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadPedido(?int $sucursalId = null): array
    {
        $payload = [
            'cliente_id' => $this->cliente->id,
            'direccion_entrega' => 'Av. Siempre Viva 123',
        ];

        if ($sucursalId !== null) {
            $payload['sucursal_id'] = $sucursalId;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadNomina(?int $sucursalId = null): array
    {
        $payload = [
            'periodo_inicio' => now()->startOfMonth()->toDateString(),
            'periodo_fin' => now()->toDateString(),
        ];

        if ($sucursalId !== null) {
            $payload['sucursal_id'] = $sucursalId;
        }

        return $payload;
    }

    private function crearEmpleado(Sucursal $sucursal): Empleado
    {
        $usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Empleado '.$sucursal->nombre,
            'correo' => uniqid('empleado-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        return Empleado::create([
            'tenant_id' => $this->tenant->id,
            'usuario_id' => $usuario->id,
            'sucursal_id' => $sucursal->id,
            'salario_base' => 1000,
        ]);
    }

    private function crearVentaEn(Sucursal $sucursal, float $total): Venta
    {
        $caja = CajaSesion::create([
            'sucursal_id' => $sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto_apertura' => 0,
            'estado' => 'abierta',
        ]);

        return Venta::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $sucursal->id,
            'caja_sesion_id' => $caja->id,
            'usuario_id' => $this->usuario->id,
            'cliente_id' => $this->cliente->id,
            'total' => $total,
            'estado' => 'completada',
            'es_venta_sombra' => false,
        ]);
    }
}
