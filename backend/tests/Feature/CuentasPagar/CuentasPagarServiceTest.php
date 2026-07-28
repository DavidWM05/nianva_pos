<?php

namespace Tests\Feature\CuentasPagar;

use App\Modules\CuentasPagar\Exceptions\CuentaPagarAnuladaException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarConAbonosException;
use App\Modules\CuentasPagar\Exceptions\CuentaPagarYaPagadaException;
use App\Modules\CuentasPagar\Exceptions\PagoExcedeSaldoException;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\CuentasPagar\Services\CuentasPagarService;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CuentasPagarServiceTest extends TestCase
{
    use RefreshDatabase;

    private CuentasPagarService $service;
    private InventarioService $inventarioService;
    private CajaService $cajaService;
    private Tenant $tenant;
    private Sucursal $sucursal;
    private Usuario $usuario;
    private Proveedor $proveedor;
    private MetodoPago $transferencia;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(CuentasPagarService::class);
        $this->inventarioService = app(InventarioService::class);
        $this->cajaService = app(CajaService::class);

        $this->tenant = Tenant::create(['nombre' => 'Test CxP', 'pais' => 'MX']);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Principal']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Luis', 'correo' => 'luis-cxp@test.com', 'password' => 'secret123',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->transferencia = MetodoPago::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Transferencia', 'tipo' => 'transferencia']);
        $this->proveedor = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'Distribuidora X']);

        $cat = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Test']);
        $prod = Producto::create(['tenant_id' => $this->tenant->id, 'categoria_id' => $cat->id, 'nombre' => 'Prod', 'precio_compra' => 50, 'precio_venta' => 100]);
        $variante = ProductoVariante::create(['producto_id' => $prod->id]);

        // Hacer una compra para tener deuda
        $this->compra = $this->inventarioService->registrarCompra(
            ['tenant_id' => $this->tenant->id, 'proveedor_id' => $this->proveedor->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id],
            [['variante_id' => $variante->id, 'cantidad' => 10, 'precio_compra' => 50]],
        );

        $this->cajaService->abrirCaja($this->sucursal->id, $this->usuario->id, 5000);
    }

    private $compra;

    public function test_crear_desde_compra_crea_cxp_pendiente(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);

        $this->assertSame($this->compra->id, $cuenta->compra_id);
        $this->assertSame(500.0, (float) $cuenta->monto_total);
        $this->assertSame('pendiente', $cuenta->estado);
    }

    public function test_registrar_pago_reduce_saldo(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);

        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 200,
            'metodo_pago_id' => $this->transferencia->id,
            'referencia' => 'TRF-001',
        ]);

        $cuenta->refresh();
        $this->assertSame(300.0, (float) $cuenta->saldo_pendiente);
        $this->assertSame('pendiente', $cuenta->estado);
    }

    public function test_pago_completo_marca_pagada(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);

        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 500,
            'metodo_pago_id' => $this->transferencia->id,
        ]);

        $cuenta->refresh();
        $this->assertSame(0.0, (float) $cuenta->saldo_pendiente);
        $this->assertSame('pagada', $cuenta->estado);
    }

    public function test_pago_excede_saldo_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);

        $this->expectException(PagoExcedeSaldoException::class);
        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 999999,
            'metodo_pago_id' => $this->transferencia->id,
        ]);
    }

    public function test_pago_en_cuenta_anulada_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);
        $this->service->anular($cuenta->id);

        $this->expectException(CuentaPagarAnuladaException::class);
        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 100,
            'metodo_pago_id' => $this->transferencia->id,
        ]);
    }

    public function test_anular_con_pagos_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);
        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 100,
            'metodo_pago_id' => $this->transferencia->id,
        ]);

        $this->expectException(CuentaPagarConAbonosException::class);
        $this->service->anular($cuenta->id);
    }

    public function test_pago_en_cuenta_pagada_lanza_excepcion(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);
        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 500,
            'metodo_pago_id' => $this->transferencia->id,
        ]);

        $this->expectException(CuentaPagarYaPagadaException::class);
        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 10,
            'metodo_pago_id' => $this->transferencia->id,
        ]);
    }

    public function test_aislamiento_tenant(): void
    {
        $cuenta = $this->service->crearDesdeCompra($this->compra);
        $this->service->registrarPago($cuenta->id, [
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'monto' => 100,
            'metodo_pago_id' => $this->transferencia->id,
        ]);

        $tenant2 = Tenant::create(['nombre' => 'Otro', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, CuentaPagar::all()->count());
        $this->assertSame(0, AbonoPagar::all()->count());
    }
}
