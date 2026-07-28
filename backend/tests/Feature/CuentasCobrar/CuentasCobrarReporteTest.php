<?php

namespace Tests\Feature\CuentasCobrar;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\InventarioStock;
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
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CuentasCobrarReporteTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Sucursal $sucursal;
    private Usuario $usuario;
    private Cliente $cliente;
    private Venta $venta;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['nombre' => 'Test Reporte CxC', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Admin',
            'correo' => 'admin-reporte@test.com',
            'password' => 'secret123',
        ]);
        $this->cliente = Cliente::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Juan Pérez']);

        app(TenantContext::class)->set($this->tenant);

        // Crear rol admin + permiso reportes
        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'admin-test', 'es_sistema' => false]);
        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'reportes_cuentas_cobrar.ver'],
            ['modulo' => 'reportes_cuentas_cobrar', 'accion' => 'ver'],
        );
        $rol->permisos()->attach($permiso->id);
        $this->usuario->roles()->attach($rol->id);

        // Crear una venta para usar como FK en CuentaCobrar
        $efectivo = MetodoPago::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $categoria = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Test']);
        $producto = Producto::create(['tenant_id' => $this->tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Prod', 'precio_compra' => 10, 'precio_venta' => 100]);
        $variante = ProductoVariante::create(['producto_id' => $producto->id]);
        $proveedor = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'P']);
        $inventarioService = app(InventarioService::class);
        $inventarioService->registrarCompra(
            ['tenant_id' => $this->tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id],
            [['variante_id' => $variante->id, 'cantidad' => 100, 'precio_compra' => 10]],
        );

        $cajaService = app(CajaService::class);
        $cajaService->abrirCaja($this->sucursal->id, $this->usuario->id, 500);
        $ventaService = app(VentaService::class);
        $this->venta = $ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $efectivo->id, 'monto' => 100]],
        );
    }

    private function crearCuentaCobrar(float $monto, string $fechaVencimiento, int $clienteId): CuentaCobrar
    {
        return CuentaCobrar::create([
            'tenant_id' => $this->tenant->id,
            'venta_id' => $this->venta->id,
            'cliente_id' => $clienteId,
            'monto_total' => $monto,
            'saldo_pendiente' => $monto,
            'fecha_vencimiento' => $fechaVencimiento,
            'estado' => 'pendiente',
        ]);
    }

    public function test_reporte_clasifica_cuenta_vencida_en_bucket_correcto(): void
    {
        $this->crearCuentaCobrar(1000, now()->subDays(10)->toDateString(), $this->cliente->id);

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/cuentas-cobrar/reporte?limite=10');

        $response->assertOk();

        $data = $response->json('data');

        $this->assertEquals(1000.0, $data['total_pendiente']);
        $this->assertEquals(1000.0, $data['total_vencido']);
        $this->assertEquals(0.0, $data['por_antiguedad']['al_dia']);
        $this->assertEquals(1000.0, $data['por_antiguedad']['vencido_1_30']);
        $this->assertEquals(0.0, $data['por_antiguedad']['vencido_31_60']);
        $this->assertEquals(0.0, $data['por_antiguedad']['vencido_61_90']);
        $this->assertEquals(0.0, $data['por_antiguedad']['vencido_90_mas']);
    }

    public function test_reporte_clasifica_cuenta_por_vencer_en_al_dia(): void
    {
        $this->crearCuentaCobrar(500, now()->addDays(15)->toDateString(), $this->cliente->id);

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/cuentas-cobrar/reporte?limite=10');

        $response->assertOk();

        $data = $response->json('data');

        $this->assertEquals(500.0, $data['total_pendiente']);
        $this->assertEquals(0.0, $data['total_vencido']);
        $this->assertEquals(500.0, $data['por_antiguedad']['al_dia']);
        $this->assertEquals(0.0, $data['por_antiguedad']['vencido_1_30']);
    }

    public function test_reporte_muestra_cliente_top(): void
    {
        $this->crearCuentaCobrar(2000, now()->subDays(5)->toDateString(), $this->cliente->id);

        $this->actingAs($this->usuario);

        $response = $this->getJson('/api/cuentas-cobrar/reporte');

        $response->assertOk();

        $porCliente = $response->json('data.por_cliente');

        $this->assertCount(1, $porCliente);
        $this->assertSame($this->cliente->id, $porCliente[0]['cliente_id']);
        $this->assertSame('Juan Pérez', $porCliente[0]['cliente_nombre']);
        $this->assertEquals(2000.0, $porCliente[0]['saldo_pendiente']);
        $this->assertSame(1, $porCliente[0]['cuentas_pendientes']);
    }
}
