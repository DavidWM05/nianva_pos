<?php

namespace Tests\Feature\CrmAvanzado;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
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

/**
 * Cobertura de GET /crm/reporte (CrmAvanzadoController::reporte()) -- ajuste 13 lo entrego
 * sin tests, este archivo cierra ese hueco (ajuste 14). No toca la logica del endpoint, solo
 * la ejercita con fixtures conocidas y verifica los 4 bloques de la respuesta.
 */
class CrmReporteTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    private Cliente $clientePublicoGeneral;

    private Cliente $clienteVip;

    private MetodoPago $efectivo;

    private ProductoVariante $variante;

    private VentaService $ventaService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['nombre' => 'Test Reporte CRM', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Admin',
            'correo' => 'admin-crm-reporte@test.com',
            'password' => 'secret123',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'admin-test', 'es_sistema' => false]);
        $permiso = Permiso::firstOrCreate(
            ['nombre' => 'reportes_crm.ver'],
            ['modulo' => 'reportes_crm', 'accion' => 'ver'],
        );
        $rol->permisos()->attach($permiso->id);
        $this->usuario->roles()->attach($rol->id);

        // "Publico General" se crea automaticamente por tenant (ver otros tests de CRM/Tpv
        // que ya dependen de esto) -- queda con 0 ventas, segmento 'nuevo'.
        $this->clientePublicoGeneral = Cliente::where('tenant_id', $this->tenant->id)
            ->where('nombre', 'Publico General')->firstOrFail();
        $this->clienteVip = Cliente::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Cliente VIP']);

        $this->efectivo = MetodoPago::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $categoria = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Test']);
        $producto = Producto::create(['tenant_id' => $this->tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Prod', 'precio_compra' => 10, 'precio_venta' => 100]);
        $this->variante = ProductoVariante::create(['producto_id' => $producto->id]);
        $proveedor = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'P']);

        app(InventarioService::class)->registrarCompra(
            ['tenant_id' => $this->tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 100, 'precio_compra' => 10]],
        );

        app(CajaService::class)->abrirCaja($this->sucursal->id, $this->usuario->id, 5000);
        $this->ventaService = app(VentaService::class);

        // 5 ventas completadas para clienteVip -> calcularSegmento() = 'vip' (>=5 ventas).
        for ($i = 0; $i < 5; $i++) {
            $this->ventaService->registrarVenta(
                ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->clienteVip->id],
                [['variante_id' => $this->variante->id, 'cantidad' => 1]],
                [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
            );
        }
    }

    public function test_reporte_clasifica_clientes_por_segmento(): void
    {
        $this->actingAs($this->usuario);

        $data = $this->getJson('/api/crm/reporte')->assertOk()->json('data');

        $this->assertSame(1, $data['clientes_por_segmento']['nuevo']);
        $this->assertSame(0, $data['clientes_por_segmento']['frecuente']);
        $this->assertSame(1, $data['clientes_por_segmento']['vip']);
        $this->assertSame(0, $data['clientes_por_segmento']['inactivo']);
    }

    public function test_reporte_agrupa_interacciones_por_tipo(): void
    {
        CrmInteraccion::create([
            'tenant_id' => $this->tenant->id, 'cliente_id' => $this->clientePublicoGeneral->id,
            'usuario_id' => $this->usuario->id, 'tipo' => 'llamada', 'observacion' => 'Llamada 1',
        ]);
        CrmInteraccion::create([
            'tenant_id' => $this->tenant->id, 'cliente_id' => $this->clienteVip->id,
            'usuario_id' => $this->usuario->id, 'tipo' => 'email', 'observacion' => 'Email 1',
        ]);
        CrmInteraccion::create([
            'tenant_id' => $this->tenant->id, 'cliente_id' => $this->clienteVip->id,
            'usuario_id' => $this->usuario->id, 'tipo' => 'email', 'observacion' => 'Email 2',
        ]);

        $this->actingAs($this->usuario);

        $data = $this->getJson('/api/crm/reporte')->assertOk()->json('data');

        $this->assertSame(1, $data['interacciones_por_tipo']['llamada']);
        $this->assertSame(2, $data['interacciones_por_tipo']['email']);
        // Sin interacciones de tipo 'nota' -- la clave ni aparece (pluck('total','tipo') solo trae tipos con >=1 fila).
        $this->assertArrayNotHasKey('nota', $data['interacciones_por_tipo']);
    }

    public function test_reporte_suma_puntos_de_loyalty_en_positivo_para_canjeados_y_vencidos(): void
    {
        LoyaltyTransaccion::create([
            'tenant_id' => $this->tenant->id, 'cliente_id' => $this->clienteVip->id,
            'tipo' => 'ganados', 'puntos' => 100,
        ]);
        LoyaltyTransaccion::create([
            'tenant_id' => $this->tenant->id, 'cliente_id' => $this->clienteVip->id,
            'tipo' => 'canjeados', 'puntos' => -30,
        ]);
        LoyaltyTransaccion::create([
            'tenant_id' => $this->tenant->id, 'cliente_id' => $this->clienteVip->id,
            'tipo' => 'vencidos', 'puntos' => -10,
        ]);
        $this->clienteVip->increment('puntos_loyalty', 60);

        $this->actingAs($this->usuario);

        $data = $this->getJson('/api/crm/reporte')->assertOk()->json('data');

        $this->assertSame(100, $data['loyalty']['puntos_ganados_total']);
        $this->assertSame(30, $data['loyalty']['puntos_canjeados_total']);
        $this->assertSame(10, $data['loyalty']['puntos_vencidos_total']);
        $this->assertSame(60, $data['loyalty']['saldo_actual_total']);
    }

    public function test_reporte_incluye_campanas_recientes(): void
    {
        CrmCampana::create([
            'tenant_id' => $this->tenant->id,
            'usuario_id' => $this->usuario->id,
            'asunto' => 'Promo de prueba',
            'mensaje' => 'Contenido',
            'segmento' => 'vip',
            'destinatarios' => 1,
            'enviado_en' => now(),
        ]);

        $this->actingAs($this->usuario);

        $data = $this->getJson('/api/crm/reporte')->assertOk()->json('data');

        $this->assertCount(1, $data['campanas_recientes']);
        $this->assertSame('Promo de prueba', $data['campanas_recientes'][0]['asunto']);
        $this->assertSame('vip', $data['campanas_recientes'][0]['segmento']);
        $this->assertSame(1, $data['campanas_recientes'][0]['destinatarios']);
    }

    public function test_reporte_sin_permiso_devuelve_403(): void
    {
        $usuarioSinPermiso = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Sin Permiso',
            'correo' => 'sinpermiso-crm-reporte@test.com',
            'password' => 'secret123',
        ]);

        $this->actingAs($usuarioSinPermiso);

        $this->getJson('/api/crm/reporte')->assertForbidden();
    }
}
