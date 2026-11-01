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
        $inventarioService->registrarCompra(
            ['tenant_id' => $this->tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 100, 'precio_compra' => 50]],
        );

        $cajaService = app(CajaService::class);
        $cajaService->abrirCaja($this->sucursal->id, $this->usuario->id, 500);
        $this->ventaService = app(VentaService::class);
    }

    public function test_reporte_devuelve_ventas_del_periodo(): void
    {
        $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 2]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 200]],
        );
        $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );

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
        $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );

        $this->actingAs($this->usuario);

        $ayer = now()->subDay()->toDateString();
        $response = $this->getJson("/api/v1/ventas/reporte?fecha_desde={$ayer}&fecha_hasta={$ayer}");

        $response->assertOk();
        $this->assertSame(0, $response->json('data.numero_ventas'));
    }

    public function test_reporte_incluye_top_productos(): void
    {
        $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 3]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 300]],
        );

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

        $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 2]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 120], ['metodo_pago_id' => $tarjeta->id, 'monto' => 80]],
        );

        $this->actingAs($this->usuario);

        $porMetodo = collect($this->getJson('/api/v1/ventas/reporte')->assertOk()->json('data.por_metodo_pago'))
            ->pluck('total', 'metodo_pago_nombre');

        $this->assertEquals(120.0, $porMetodo['Efectivo']);
        $this->assertEquals(80.0, $porMetodo['Tarjeta']);
    }

    public function test_reporte_top_productos_con_varias_variantes_trae_sus_nombres(): void
    {
        $otra = ProductoVariante::create(['producto_id' => $this->variante->producto_id, 'talla' => 'L', 'color' => 'Blanco']);
        app(InventarioService::class)->registrarCompra(
            ['tenant_id' => $this->tenant->id, 'proveedor_id' => Proveedor::firstOrFail()->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id],
            [['variante_id' => $otra->id, 'cantidad' => 10, 'precio_compra' => 50]],
        );

        $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 2], ['variante_id' => $otra->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 300]],
        );

        $this->actingAs($this->usuario);

        $top = collect($this->getJson('/api/v1/ventas/reporte')->assertOk()->json('data.top_productos'))
            ->keyBy('variante_id');

        $this->assertSame('Playera', $top[$this->variante->id]['producto_nombre']);
        $this->assertSame('L', $top[$otra->id]['talla']);
        $this->assertSame('Blanco', $top[$otra->id]['color']);
    }
}
