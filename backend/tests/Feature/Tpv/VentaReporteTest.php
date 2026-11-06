<?php

namespace Tests\Feature\Tpv;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Bloqueos04c;
use Tests\Support\Bloqueos04e;
use Tests\TestCase;

class VentaReporteTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    private Cliente $cliente;

    private MetodoPago $efectivo;

    private ProductoVariante $variante;

    private VentaService $ventaService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['nombre' => 'Test Venta Reporte', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Admin',
            'correo' => 'admin-venta-reporte@test.com',
            'password' => 'secret123',
        ]);
        $this->cliente = Cliente::where('tenant_id', $this->tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        app(TenantContext::class)->set($this->tenant);

        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'admin-test', 'es_sistema' => false]);
        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'reportes.ver'],
            ['modulo' => 'reportes', 'accion' => 'ver'],
        );
        $rol->permisos()->attach($permiso->id);
        $this->usuario->roles()->attach($rol->id);

        $this->efectivo = MetodoPago::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $tarjeta = MetodoPago::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Tarjeta', 'tipo' => 'tarjeta']);

        $categoria = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Ropa']);
        $producto = Producto::create([
            'tenant_id' => $this->tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Playera', 'precio_compra' => 50, 'precio_venta' => 100,
        ]);
        $this->variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'M', 'color' => 'Negro']);
        $proveedor = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'Textiles']);

        $inventarioService = app(InventarioService::class);
        $datos04e3 = ['tenant_id' => $this->tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id];
        $items04e3 = [['variante_id' => $this->variante->id, 'cantidad' => 100, 'precio_compra' => 50]];
        $inventarioService->registrarCompraConStocks($datos04e3, $items04e3, Bloqueos04e::stocks((int) $datos04e3['sucursal_id'], array_column($items04e3, 'variante_id')));

        $cajaService = app(CajaService::class);
        $cajaService->abrirCajaConSucursal(Bloqueos04e::sucursal($this->sucursal->id), $this->usuario->id, 500);
        $this->ventaService = app(VentaService::class);
    }

    public function test_reporte_devuelve_ventas_del_periodo(): void
    {
        $datos04e9 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e9 = [['variante_id' => $this->variante->id, 'cantidad' => 2]];
        $caja04e9 = Bloqueos04c::caja((int) $datos04e9['sucursal_id']);
        $stocks04e9 = $caja04e9 === null ? [] : Bloqueos04e::stocks((int) $datos04e9['sucursal_id'], array_column($items04e9, 'variante_id'));
        $this->ventaService->registrarVentaConBloqueos($datos04e9, $items04e9, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 200]], $caja04e9, $stocks04e9);
        $datos04e8 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e8 = [['variante_id' => $this->variante->id, 'cantidad' => 1]];
        $caja04e8 = Bloqueos04c::caja((int) $datos04e8['sucursal_id']);
        $stocks04e8 = $caja04e8 === null ? [] : Bloqueos04e::stocks((int) $datos04e8['sucursal_id'], array_column($items04e8, 'variante_id'));
        $this->ventaService->registrarVentaConBloqueos($datos04e8, $items04e8, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]], $caja04e8, $stocks04e8);

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/ventas/reporte');

        $response->assertOk();
        $data = $response->json('data');

        $this->assertEquals(300.0, $data['total_ventas']);
        $this->assertSame(2, $data['numero_ventas']);
        $this->assertEquals(150.0, $data['ticket_promedio']);
    }

    public function test_reporte_filtra_por_fecha(): void
    {
        $datos04e7 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e7 = [['variante_id' => $this->variante->id, 'cantidad' => 1]];
        $caja04e7 = Bloqueos04c::caja((int) $datos04e7['sucursal_id']);
        $stocks04e7 = $caja04e7 === null ? [] : Bloqueos04e::stocks((int) $datos04e7['sucursal_id'], array_column($items04e7, 'variante_id'));
        $this->ventaService->registrarVentaConBloqueos($datos04e7, $items04e7, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]], $caja04e7, $stocks04e7);

        $this->actingAs($this->usuario);

        $ayer = now()->subDay()->toDateString();
        $response = $this->getJson("/api/v1/ventas/reporte?fecha_desde={$ayer}&fecha_hasta={$ayer}");

        $response->assertOk();
        $this->assertSame(0, $response->json('data.numero_ventas'));
    }

    public function test_reporte_incluye_top_productos(): void
    {
        $datos04e6 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e6 = [['variante_id' => $this->variante->id, 'cantidad' => 3]];
        $caja04e6 = Bloqueos04c::caja((int) $datos04e6['sucursal_id']);
        $stocks04e6 = $caja04e6 === null ? [] : Bloqueos04e::stocks((int) $datos04e6['sucursal_id'], array_column($items04e6, 'variante_id'));
        $this->ventaService->registrarVentaConBloqueos($datos04e6, $items04e6, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 300]], $caja04e6, $stocks04e6);

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/v1/ventas/reporte');
        $response->assertOk();

        $top = $response->json('data.top_productos');

        $this->assertCount(1, $top);
        $this->assertSame($this->variante->id, $top[0]['variante_id']);
        $this->assertSame('Playera', $top[0]['producto_nombre']);
        $this->assertSame('M', $top[0]['talla']);
        $this->assertSame('Negro', $top[0]['color']);
        $this->assertSame(3, $top[0]['cantidad_vendida']);
        $this->assertEquals(300.0, $top[0]['total_vendido']);
    }

    public function test_reporte_agrupa_por_metodo_de_pago_con_su_nombre(): void
    {
        $tarjeta = MetodoPago::where('tenant_id', $this->tenant->id)->where('nombre', 'Tarjeta')->firstOrFail();

        $datos04e5 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e5 = [['variante_id' => $this->variante->id, 'cantidad' => 2]];
        $caja04e5 = Bloqueos04c::caja((int) $datos04e5['sucursal_id']);
        $stocks04e5 = $caja04e5 === null ? [] : Bloqueos04e::stocks((int) $datos04e5['sucursal_id'], array_column($items04e5, 'variante_id'));
        $this->ventaService->registrarVentaConBloqueos($datos04e5, $items04e5, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 120], ['metodo_pago_id' => $tarjeta->id, 'monto' => 80]], $caja04e5, $stocks04e5);

        $this->actingAs($this->usuario);

        $porMetodo = collect($this->getJson('/api/v1/ventas/reporte')->assertOk()->json('data.por_metodo_pago'))
            ->pluck('total', 'metodo_pago_nombre');

        $this->assertEquals(120.0, $porMetodo['Efectivo']);
        $this->assertEquals(80.0, $porMetodo['Tarjeta']);
    }

    public function test_reporte_top_productos_con_varias_variantes_trae_sus_nombres(): void
    {
        $otra = ProductoVariante::create(['producto_id' => $this->variante->producto_id, 'talla' => 'L', 'color' => 'Blanco']);
        $datos04e2 = ['tenant_id' => $this->tenant->id, 'proveedor_id' => Proveedor::firstOrFail()->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id];
        $items04e2 = [['variante_id' => $otra->id, 'cantidad' => 10, 'precio_compra' => 50]];
        app(InventarioService::class)->registrarCompraConStocks($datos04e2, $items04e2, Bloqueos04e::stocks((int) $datos04e2['sucursal_id'], array_column($items04e2, 'variante_id')));

        $datos04e4 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e4 = [['variante_id' => $this->variante->id, 'cantidad' => 2], ['variante_id' => $otra->id, 'cantidad' => 1]];
        $caja04e4 = Bloqueos04c::caja((int) $datos04e4['sucursal_id']);
        $stocks04e4 = $caja04e4 === null ? [] : Bloqueos04e::stocks((int) $datos04e4['sucursal_id'], array_column($items04e4, 'variante_id'));
        $this->ventaService->registrarVentaConBloqueos($datos04e4, $items04e4, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 300]], $caja04e4, $stocks04e4);

        $this->actingAs($this->usuario);

        $top = collect($this->getJson('/api/v1/ventas/reporte')->assertOk()->json('data.top_productos'))
            ->keyBy('variante_id');

        $this->assertSame('Playera', $top[$this->variante->id]['producto_nombre']);
        $this->assertSame('L', $top[$otra->id]['talla']);
        $this->assertSame('Blanco', $top[$otra->id]['color']);
    }
}
