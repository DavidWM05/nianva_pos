<?php

namespace Tests\Feature\CuentasCobrar;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CuentasCobrar\Exceptions\AbonoExcedeSaldoException;
use App\Modules\CuentasCobrar\Exceptions\CuentaAnuladaException;
use App\Modules\CuentasCobrar\Exceptions\CuentaConAbonosException;
use App\Modules\CuentasCobrar\Exceptions\CuentaYaPagadaException;
use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasCobrar\Services\CuentasCobrarService;
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
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CuentasCobrarServiceTest extends TestCase
{
    use RefreshDatabase;

    private CuentasCobrarService $service;

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
        $this->service = app(CuentasCobrarService::class);
        $this->ventaService = app(VentaService::class);
        $this->inventarioService = app(InventarioService::class);
        $this->cajaService = app(CajaService::class);

        $this->tenant = Tenant::create(['nombre' => 'Test CxC', 'pais' => 'MX']);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Principal']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Ana', 'correo' => 'ana-cxc@test.com', 'password' => 'secret123',
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

        $this->cajaService->abrirCaja($this->sucursal->id, $this->usuario->id, 500);

        // Crear venta como base para las CxC
        $this->venta = $this->ventaService->registrarVenta(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id],
            [['variante_id' => $variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->efectivo->id, 'monto' => 100]],
        );
    }

    private Venta $venta;

    public function test_crear_desde_venta_crea_cxc_pendiente(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);

        $this->assertSame($this->venta->id, $cuenta->venta_id);
        $this->assertSame(100.0, (float) $cuenta->monto_total);
        $this->assertSame(100.0, (float) $cuenta->saldo_pendiente);
        $this->assertSame('pendiente', $cuenta->estado);
        $this->assertNotNull($cuenta->fecha_vencimiento);
    }

    public function test_registrar_abono_reduce_saldo(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);

        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 30,
            'metodo_pago_id' => $this->efectivo->id,
        ]);

        $cuenta->refresh();
        $this->assertSame(70.0, (float) $cuenta->saldo_pendiente);
        $this->assertSame('pendiente', $cuenta->estado);
    }

    public function test_abono_completo_marca_pagada(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);

        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 100,
            'metodo_pago_id' => $this->efectivo->id,
        ]);

        $cuenta->refresh();
        $this->assertSame(0.0, (float) $cuenta->saldo_pendiente);
        $this->assertSame('pagada', $cuenta->estado);
    }

    public function test_abono_excede_saldo_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);

        $this->expectException(AbonoExcedeSaldoException::class);
        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 200,
            'metodo_pago_id' => $this->efectivo->id,
        ]);
    }

    public function test_abono_en_cuenta_pagada_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);
        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 100,
            'metodo_pago_id' => $this->efectivo->id,
        ]);

        $this->expectException(CuentaYaPagadaException::class);
        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 10,
            'metodo_pago_id' => $this->efectivo->id,
        ]);
    }

    public function test_abono_en_cuenta_anulada_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);
        $this->service->anular($cuenta->id);

        $this->expectException(CuentaAnuladaException::class);
        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 10,
            'metodo_pago_id' => $this->efectivo->id,
        ]);
    }

    public function test_anular_sin_abonos_es_valido(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);

        $this->service->anular($cuenta->id);

        $this->assertSame('anulada', $cuenta->fresh()->estado);
    }

    public function test_anular_con_abonos_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);
        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 30,
            'metodo_pago_id' => $this->efectivo->id,
        ]);

        $this->expectException(CuentaConAbonosException::class);
        $this->service->anular($cuenta->id);
    }

    public function test_obtener_vencidas_solo_devuelve_pendientes_vencidas(): void
    {
        $this->service->crearDesdeVenta($this->venta, diasCredito: -1);

        $vencidas = $this->service->obtenerVencidas();

        $this->assertCount(1, $vencidas);
        $this->assertSame('pendiente', $vencidas->first()->estado);
    }

    public function test_aislamiento_tenant_cxc_y_abonos(): void
    {
        $cuenta = $this->service->crearDesdeVenta($this->venta);
        $this->service->registrarAbono($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 30,
            'metodo_pago_id' => $this->efectivo->id,
        ]);

        // Cambiar de tenant
        $tenant2 = Tenant::create(['nombre' => 'Otro', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, CuentaCobrar::all()->count());
        $this->assertSame(0, AbonoCuenta::all()->count());
        $this->assertSame(1, CuentaCobrar::sinTenant()->count());
    }
}
