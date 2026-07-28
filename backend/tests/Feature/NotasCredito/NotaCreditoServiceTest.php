<?php

namespace Tests\Feature\NotasCredito;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Services\DevolucionService;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\NotasCredito\Exceptions\NotaCreditoExpiradaException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSaldoInsuficienteException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSinSaldoException;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotaCreditoServiceTest extends TestCase
{
    use RefreshDatabase;

    private NotaCreditoService $service;
    private DevolucionService $devolucionService;
    private VentaService $ventaService;
    private InventarioService $inventarioService;
    private CajaService $cajaService;
    private Tenant $tenant;
    private Sucursal $sucursal;
    private Usuario $usuario;
    private Cliente $cliente;
    private MetodoPago $efectivo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(NotaCreditoService::class);
        $this->devolucionService = app(DevolucionService::class);
        $this->ventaService = app(VentaService::class);
        $this->inventarioService = app(InventarioService::class);
        $this->cajaService = app(CajaService::class);

        $this->tenant = Tenant::create(['nombre' => 'Test NC', 'pais' => 'MX']);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Ana', 'correo' => 'ana-nc@test.com', 'password' => 'secret123',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->cliente = Cliente::where('tenant_id', $this->tenant->id)->where('nombre', 'Publico General')->firstOrFail();
        $this->efectivo = MetodoPago::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $cat = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Test']);
        $prod = Producto::create(['tenant_id' => $this->tenant->id, 'categoria_id' => $cat->id, 'nombre' => 'Prod', 'precio_compra' => 10, 'precio_venta' => 100]);
        $variante = ProductoVariante::create(['producto_id' => $prod->id]);
        $prov = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'P']);
        $this->inventarioService->registrarCompra(
            ['tenant_id' => $this->tenant->id, 'proveedor_id' => $prov->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id],
            [['variante_id' => $variante->id, 'cantidad' => 100, 'precio_compra' => 10]],
        );

        $this->cajaService->abrirCaja($this->sucursal->id, $this->usuario->id, 5000);
        $this->variante = $variante;
    }

    private ProductoVariante $variante;

    private function crearVentaYDevolucion(): array
    {
        $venta = $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 2]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 200]],
        );

        $devolucion = $this->devolucionService->registrarDevolucion(
            $venta,
            'devolucion',
            [
                ['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100],
            ],
            [], // sin items nuevos
            $this->sucursal->id,
            $this->usuario->id,
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
            null, // motivo
        );

        return compact('venta', 'devolucion');
    }

    public function test_crear_desde_devolucion(): void
    {
        $ctx = $this->crearVentaYDevolucion();

        $nc = $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $this->assertSame($ctx['devolucion']->id, $nc->devolucion_id);
        $this->assertSame(100.0, (float) $nc->monto_original);
        $this->assertSame(100.0, (float) $nc->saldo_disponible);
        $this->assertSame('activa', $nc->estado);
    }

    public function test_usar_en_venta_descuenta_saldo(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $venta2 = $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );

        $this->service->usarEnVenta($nc->id, $venta2->id, 40);

        $nc->refresh();
        $this->assertSame(60.0, (float) $nc->saldo_disponible);
        $this->assertSame('usada_parcial', $nc->estado);
    }

    public function test_usar_saldo_completo_marca_usada_total(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $venta2 = $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );

        $this->service->usarEnVenta($nc->id, $venta2->id, 100);

        $nc->refresh();
        $this->assertSame(0.0, (float) $nc->saldo_disponible);
        $this->assertSame('usada_total', $nc->estado);
    }

    public function test_usar_mas_que_saldo_lanza_excepcion(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $venta2 = $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );

        $this->expectException(NotaCreditoSaldoInsuficienteException::class);
        $this->service->usarEnVenta($nc->id, $venta2->id, 999);
    }

    public function test_obtener_activas_por_cliente(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $activas = $this->service->obtenerActivasPorCliente($this->cliente->id);

        $this->assertCount(1, $activas);
    }

    public function test_validar_para_pago_ok(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $validada = $this->service->validarParaPago($nc->id);

        $this->assertSame($nc->id, $validada->id);
    }

    public function test_validar_para_pago_sin_saldo_lanza_excepcion(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $venta2 = $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );
        $this->service->usarEnVenta($nc->id, $venta2->id, 100);

        $this->expectException(NotaCreditoSinSaldoException::class);
        $this->service->validarParaPago($nc->id);
    }

    public function test_aislamiento_tenant(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $this->service->crearDesdeDevolucion($ctx['devolucion']);

        $tenant2 = Tenant::create(['nombre' => 'Otro', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, NotaCredito::all()->count());
    }
}
