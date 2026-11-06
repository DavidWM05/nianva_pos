<?php

namespace Tests\Feature\NotasCredito;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Devoluciones\Services\DevolucionService;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSaldoInsuficienteException;
use App\Modules\NotasCredito\Exceptions\NotaCreditoSinSaldoException;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\Bloqueos04c;
use Tests\Support\Bloqueos04d;
use Tests\Support\Bloqueos04e;
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
        $datos04e2 = ['tenant_id' => $this->tenant->id, 'proveedor_id' => $prov->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id];
        $items04e2 = [['variante_id' => $variante->id, 'cantidad' => 100, 'precio_compra' => 10]];
        $this->inventarioService->registrarCompraConStocks($datos04e2, $items04e2, Bloqueos04e::stocks((int) $datos04e2['sucursal_id'], array_column($items04e2, 'variante_id')));

        $this->cajaService->abrirCajaConSucursal(Bloqueos04e::sucursal($this->sucursal->id), $this->usuario->id, 5000);
        $this->variante = $variante;
    }

    private ProductoVariante $variante;

    private function crearVentaYDevolucion(): array
    {
        $datos04e7 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e7 = [['variante_id' => $this->variante->id, 'cantidad' => 2]];
        $caja04e7 = Bloqueos04c::caja((int) $datos04e7['sucursal_id']);
        $stocks04e7 = $caja04e7 === null ? [] : Bloqueos04e::stocks((int) $datos04e7['sucursal_id'], array_column($items04e7, 'variante_id'));
        $venta = $this->ventaService->registrarVentaConBloqueos($datos04e7, $items04e7, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 200]], $caja04e7, $stocks04e7);

        $devolucion = $this->devolucionService->registrarDevolucionConBloqueos(
            Bloqueos04c::venta($venta),
            'devolucion',
            [
                ['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100],
            ],
            [], // sin items nuevos
            $this->sucursal->id,
            $this->usuario->id,
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
            null, // motivo
            caja: Bloqueos04c::caja($this->sucursal->id),
            stocks: Bloqueos04c::stocks($this->sucursal->id),
        );

        return compact('venta', 'devolucion');
    }

    public function test_crear_desde_devolucion(): void
    {
        $ctx = $this->crearVentaYDevolucion();

        $nc = $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $this->assertSame($ctx['devolucion']->id, $nc->devolucion_id);
        $this->assertSame(100.0, (float) $nc->monto_original);
        $this->assertSame(100.0, (float) $nc->saldo_disponible);
        $this->assertSame('activa', $nc->estado);
    }

    public function test_usar_en_venta_descuenta_saldo(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $datos04e6 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e6 = [['variante_id' => $this->variante->id, 'cantidad' => 1]];
        $caja04e6 = Bloqueos04c::caja((int) $datos04e6['sucursal_id']);
        $stocks04e6 = $caja04e6 === null ? [] : Bloqueos04e::stocks((int) $datos04e6['sucursal_id'], array_column($items04e6, 'variante_id'));
        $venta2 = $this->ventaService->registrarVentaConBloqueos($datos04e6, $items04e6, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]], $caja04e6, $stocks04e6);

        $this->service->usarEnVentaConNota(Bloqueos04d::modelo($nc), $venta2->id, 40);

        $nc->refresh();
        $this->assertSame(60.0, (float) $nc->saldo_disponible);
        $this->assertSame('usada_parcial', $nc->estado);
    }

    public function test_usar_saldo_completo_marca_usada_total(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $datos04e5 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e5 = [['variante_id' => $this->variante->id, 'cantidad' => 1]];
        $caja04e5 = Bloqueos04c::caja((int) $datos04e5['sucursal_id']);
        $stocks04e5 = $caja04e5 === null ? [] : Bloqueos04e::stocks((int) $datos04e5['sucursal_id'], array_column($items04e5, 'variante_id'));
        $venta2 = $this->ventaService->registrarVentaConBloqueos($datos04e5, $items04e5, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]], $caja04e5, $stocks04e5);

        $this->service->usarEnVentaConNota(Bloqueos04d::modelo($nc), $venta2->id, 100);

        $nc->refresh();
        $this->assertSame(0.0, (float) $nc->saldo_disponible);
        $this->assertSame('usada_total', $nc->estado);
    }

    public function test_usar_mas_que_saldo_lanza_excepcion(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $datos04e4 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e4 = [['variante_id' => $this->variante->id, 'cantidad' => 1]];
        $caja04e4 = Bloqueos04c::caja((int) $datos04e4['sucursal_id']);
        $stocks04e4 = $caja04e4 === null ? [] : Bloqueos04e::stocks((int) $datos04e4['sucursal_id'], array_column($items04e4, 'variante_id'));
        $venta2 = $this->ventaService->registrarVentaConBloqueos($datos04e4, $items04e4, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]], $caja04e4, $stocks04e4);

        $this->expectException(NotaCreditoSaldoInsuficienteException::class);
        $this->service->usarEnVentaConNota(Bloqueos04d::modelo($nc), $venta2->id, 999);
    }

    public function test_obtener_activas_por_cliente(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $activas = $this->service->obtenerActivasPorCliente($this->cliente->id);

        $this->assertCount(1, $activas);
    }

    public function test_validar_para_pago_ok(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $validada = $this->service->validarParaPago($nc->id);

        $this->assertSame($nc->id, $validada->id);
    }

    public function test_validar_para_pago_sin_saldo_lanza_excepcion(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $nc = $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $datos04e3 = ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id];
        $items04e3 = [['variante_id' => $this->variante->id, 'cantidad' => 1]];
        $caja04e3 = Bloqueos04c::caja((int) $datos04e3['sucursal_id']);
        $stocks04e3 = $caja04e3 === null ? [] : Bloqueos04e::stocks((int) $datos04e3['sucursal_id'], array_column($items04e3, 'variante_id'));
        $venta2 = $this->ventaService->registrarVentaConBloqueos($datos04e3, $items04e3, [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]], $caja04e3, $stocks04e3);
        $this->service->usarEnVentaConNota(Bloqueos04d::modelo($nc), $venta2->id, 100);

        $this->expectException(NotaCreditoSinSaldoException::class);
        $this->service->validarParaPago($nc->id);
    }

    public function test_aislamiento_tenant(): void
    {
        $ctx = $this->crearVentaYDevolucion();
        $this->service->crearDesdeDevolucion(Bloqueos04d::modelo($ctx['devolucion']));

        $tenant2 = Tenant::create(['nombre' => 'Otro', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, NotaCredito::all()->count());
    }
}
