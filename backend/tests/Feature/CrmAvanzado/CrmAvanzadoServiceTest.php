<?php

namespace Tests\Feature\CrmAvanzado;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\CrmAvanzado\Exceptions\PuntosInsuficientesException;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\CrmAvanzado\Services\CrmAvanzadoService;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrmAvanzadoServiceTest extends TestCase
{
    use RefreshDatabase;

    private CrmAvanzadoService $service;
    private VentaService $ventaService;
    private InventarioService $inventarioService;
    private CajaService $cajaService;
    private Tenant $tenant;
    private Sucursal $sucursal;
    private Usuario $usuario;
    private Cliente $cliente;
    private MetodoPago $efectivo;
    private ProductoVariante $variante;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(CrmAvanzadoService::class);
        $this->ventaService = app(VentaService::class);
        $this->inventarioService = app(InventarioService::class);
        $this->cajaService = app(CajaService::class);

        $this->tenant = Tenant::create(['nombre' => 'Test CRM', 'pais' => 'MX']);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Admin', 'correo' => 'admin-crm@test.com', 'password' => 'secret123',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->cliente = Cliente::where('tenant_id', $this->tenant->id)->where('nombre', 'Publico General')->firstOrFail();
        $this->efectivo = MetodoPago::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $cat = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Test']);
        $prod = Producto::create(['tenant_id' => $this->tenant->id, 'categoria_id' => $cat->id, 'nombre' => 'Prod', 'precio_compra' => 10, 'precio_venta' => 100]);
        $this->variante = ProductoVariante::create(['producto_id' => $prod->id]);
        $prov = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'P']);
        $this->inventarioService->registrarCompra(
            ['tenant_id' => $this->tenant->id, 'proveedor_id' => $prov->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 100, 'precio_compra' => 10]],
        );

        $this->cajaService->abrirCaja($this->sucursal->id, $this->usuario->id, 5000);
    }

    public function test_registrar_interaccion(): void
    {
        $interaccion = $this->service->registrarInteraccion($this->cliente->id, [
            'usuario_id' => $this->usuario->id,
            'tipo' => 'llamada',
            'observacion' => 'Cliente solicito informacion',
        ]);

        $this->assertSame($this->cliente->id, $interaccion->cliente_id);
        $this->assertSame('llamada', $interaccion->tipo);
        $this->assertSame('Cliente solicito informacion', $interaccion->observacion);
    }

    public function test_obtener_interacciones_por_cliente(): void
    {
        $this->service->registrarInteraccion($this->cliente->id, [
            'usuario_id' => $this->usuario->id, 'tipo' => 'nota', 'observacion' => 'Nota 1',
        ]);
        $this->service->registrarInteraccion($this->cliente->id, [
            'usuario_id' => $this->usuario->id, 'tipo' => 'email', 'observacion' => 'Email 1',
        ]);

        $interacciones = $this->service->obtenerInteracciones($this->cliente->id);

        $this->assertCount(2, $interacciones);
    }

    public function test_calcular_segmento_nuevo_sin_ventas(): void
    {
        $cliente = Cliente::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Nuevo Cliente']);

        $segmento = $this->service->calcularSegmento($cliente->id);

        $this->assertSame('nuevo', $segmento);
    }

    public function test_calcular_segmento_frecuente_con_ventas(): void
    {
        $this->crearVentas(2);

        $segmento = $this->service->calcularSegmento($this->cliente->id);

        $this->assertSame('frecuente', $segmento);
    }

    public function test_calcular_segmento_vip_con_5_ventas(): void
    {
        $this->crearVentas(5);

        $segmento = $this->service->calcularSegmento($this->cliente->id);

        $this->assertSame('vip', $segmento);
    }

    public function test_registrar_puntos_por_venta(): void
    {
        $venta = $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );

        $transaccion = $this->service->registrarPuntosPorVenta($venta, 10);

        $this->assertSame(10, $transaccion->puntos);
        $this->assertSame('ganados', $transaccion->tipo);

        $this->cliente->refresh();
        $this->assertSame(10, $this->cliente->puntos_loyalty);
        $this->assertSame(10, $this->cliente->puntos_acumulados);
    }

    public function test_ajustar_puntos_positivo(): void
    {
        $transaccion = $this->service->ajustarPuntos($this->cliente->id, 50, 'Ajuste manual');

        $this->assertSame(50, $transaccion->puntos);
        $this->cliente->refresh();
        $this->assertSame(50, $this->cliente->puntos_loyalty);
        $this->assertSame(50, $this->cliente->puntos_acumulados);
    }

    public function test_ajustar_puntos_negativo_reduce_saldo(): void
    {
        $this->cliente->increment('puntos_loyalty', 100);
        $this->cliente->increment('puntos_acumulados', 100);

        $this->service->ajustarPuntos($this->cliente->id, -30, 'Canje');

        $this->cliente->refresh();
        $this->assertSame(70, $this->cliente->puntos_loyalty);
    }

    public function test_ajustar_puntos_negativo_sin_saldo_lanza_excepcion(): void
    {
        $this->expectException(PuntosInsuficientesException::class);
        $this->service->ajustarPuntos($this->cliente->id, -10, 'Sin saldo');
    }

    public function test_aislamiento_tenant_interacciones(): void
    {
        $this->service->registrarInteraccion($this->cliente->id, [
            'usuario_id' => $this->usuario->id, 'tipo' => 'nota', 'observacion' => 'Test',
        ]);

        $tenant2 = Tenant::create(['nombre' => 'Otro', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, CrmInteraccion::all()->count());
        $this->assertSame(0, LoyaltyTransaccion::all()->count());
    }

    public function test_recalcular_segmentos_persiste_en_bd(): void
    {
        $this->crearVentas(3);

        $this->service->recalcularSegmentos();

        $this->cliente->refresh();
        $this->assertSame('frecuente', $this->cliente->segmento);
    }

    public function test_recalcular_segmentos_cliente_sin_ventas_es_nuevo(): void
    {
        $cliente = Cliente::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Nuevo']);

        $this->service->recalcularSegmentos();

        $cliente->refresh();
        $this->assertSame('nuevo', $cliente->segmento);
    }

    private function crearVentas(int $cantidad): void
    {
        for ($i = 0; $i < $cantidad; $i++) {
            $this->ventaService->registrarVenta(
                ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
                [['variante_id' => $this->variante->id, 'cantidad' => 1]],
                [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
            );
        }
    }
}
