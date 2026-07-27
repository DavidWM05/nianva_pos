<?php

namespace Tests\Feature\Tpv;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Services\PrecioService;
use App\Modules\Tpv\Exceptions\PagoNoCuadraException;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaPago;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cubre VentaService y CajaService juntos (el cierre de caja no tiene
 * sentido sin ventas previas) -- convertido del guion manual test_tpv.php
 * usado para validar el modulo Tpv contra MySQL real.
 */
class VentaServiceTest extends TestCase
{
    use RefreshDatabase;

    private VentaService $ventaService;

    private CajaService $cajaService;

    private InventarioService $inventarioService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->ventaService = app(VentaService::class);
        $this->cajaService = app(CajaService::class);
        $this->inventarioService = app(InventarioService::class);
    }

    /**
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente,
     *     efectivo: MetodoPago, tarjeta: MetodoPago, varianteA: ProductoVariante, varianteB: ProductoVariante}
     */
    private function prepararTenantConCatalogo(): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX']);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => 'ana@test.com', 'password' => 'secret123',
        ]);

        app(TenantContext::class)->set($tenant);

        $efectivo = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $tarjeta = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Tarjeta', 'tipo' => 'tarjeta']);

        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Ropa']);
        $productoA = Producto::create([
            'tenant_id' => $tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Playera', 'precio_compra' => 50, 'precio_venta' => 100,
        ]);
        $varianteA = ProductoVariante::create(['producto_id' => $productoA->id, 'talla' => 'M']);
        $productoB = Producto::create([
            'tenant_id' => $tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Pantalon', 'precio_compra' => 25, 'precio_venta' => 50,
        ]);
        $varianteB = ProductoVariante::create(['producto_id' => $productoB->id, 'talla' => '32']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);

        $this->inventarioService->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [
                ['variante_id' => $varianteA->id, 'cantidad' => 20, 'precio_compra' => 50],
                ['variante_id' => $varianteB->id, 'cantidad' => 10, 'precio_compra' => 25],
            ],
        );

        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'efectivo', 'tarjeta', 'varianteA', 'varianteB');
    }

    public function test_venta_con_pago_mixto_y_regla_de_precio_descuenta_stock_y_registra_los_pagos(): void
    {
        $ctx = $this->prepararTenantConCatalogo();

        ReglaPrecio::create([
            'tenant_id' => $ctx['tenant']->id, 'nombre' => '10% variante A', 'tipo' => 'porcentaje',
            'valor' => 10, 'aplica_a' => 'variante', 'variante_id' => $ctx['varianteA']->id,
        ]);

        $this->cajaService->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);

        $venta = $this->ventaService->registrarVenta(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'usuario_id' => $ctx['usuario']->id, 'cliente_id' => $ctx['cliente']->id],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 2],
                ['variante_id' => $ctx['varianteB']->id, 'cantidad' => 3],
            ],
            [
                ['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 200],
                ['metodo_pago_id' => $ctx['tarjeta']->id, 'monto' => 130],
            ],
        );

        $this->assertSame(330.0, (float) $venta->total);

        $detalleA = $venta->detalles->firstWhere('variante_id', $ctx['varianteA']->id);
        $this->assertSame(180.0, (float) $detalleA->subtotal);
        $this->assertSame(20.0, (float) $detalleA->descuento_aplicado);
        $this->assertNotNull($detalleA->regla_precio_id);

        $stockA = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first();
        $stockB = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteB']->id)->first();
        $this->assertSame(18, $stockA->stock_actual);
        $this->assertSame(7, $stockB->stock_actual);
        $this->assertSame(2, Kardex::sinTenant()->where('referencia_tabla', 'ventas')->where('referencia_id', $venta->id)->count());

        $this->assertSame(2, $venta->pagos->count());
        $this->assertSame(330.0, (float) $venta->pagos->sum('monto'));
    }

    public function test_stock_insuficiente_revierte_toda_la_venta_incluyendo_lineas_previas(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->cajaService->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);

        $stockAantes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first()->stock_actual;
        $stockBantes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteB']->id)->first()->stock_actual;

        $precioService = app(PrecioService::class);
        $totalLinea1 = $precioService->calcularDescuento($ctx['varianteA']->fresh(), 1)->subtotalConDescuento();
        $totalLinea2 = $precioService->calcularDescuento($ctx['varianteB']->fresh(), 999)->subtotalConDescuento();

        try {
            $this->ventaService->registrarVenta(
                ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'usuario_id' => $ctx['usuario']->id, 'cliente_id' => $ctx['cliente']->id],
                [
                    ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1],
                    ['variante_id' => $ctx['varianteB']->id, 'cantidad' => 999],
                ],
                [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => $totalLinea1 + $totalLinea2]],
            );
            $this->fail('Se esperaba StockInsuficienteException.');
        } catch (StockInsuficienteException) {
            // esperado
        }

        $this->assertSame($stockAantes, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first()->stock_actual);
        $this->assertSame($stockBantes, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteB']->id)->first()->stock_actual);
        $this->assertSame(0, Venta::sinTenant()->count());
    }

    public function test_pagos_que_no_cuadran_son_rechazados_sin_tocar_inventario(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->cajaService->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);

        $stockAantes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first()->stock_actual;

        try {
            $this->ventaService->registrarVenta(
                ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'usuario_id' => $ctx['usuario']->id, 'cliente_id' => $ctx['cliente']->id],
                [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
                [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 50]],
            );
            $this->fail('Se esperaba PagoNoCuadraException.');
        } catch (PagoNoCuadraException) {
            // esperado
        }

        $this->assertSame($stockAantes, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first()->stock_actual);
        $this->assertSame(0, Venta::sinTenant()->count());
    }

    public function test_anular_venta_revierte_stock_marca_estado_y_no_borra_nada(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->cajaService->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);

        $venta = $this->ventaService->registrarVenta(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'usuario_id' => $ctx['usuario']->id, 'cliente_id' => $ctx['cliente']->id],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 2],
                ['variante_id' => $ctx['varianteB']->id, 'cantidad' => 3],
            ],
            [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 350]],
        );

        $stockAantes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first()->stock_actual;
        $stockBantes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteB']->id)->first()->stock_actual;

        $ventaAnulada = $this->ventaService->anularVenta($venta, 'Cliente se arrepintio', $ctx['usuario']);

        $this->assertSame('anulada', $ventaAnulada->estado);
        $this->assertSame('Cliente se arrepintio', $ventaAnulada->motivo_anulacion);
        $this->assertNotNull($ventaAnulada->fecha_anulacion);
        $this->assertSame($ctx['usuario']->id, $ventaAnulada->usuario_anulacion_id);

        $this->assertSame($stockAantes + 2, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first()->stock_actual);
        $this->assertSame($stockBantes + 3, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteB']->id)->first()->stock_actual);

        $kardexInverso = Kardex::sinTenant()->where('referencia_tabla', 'ventas')->where('referencia_id', $venta->id)->where('tipo', 'entrada')->get();
        $this->assertCount(2, $kardexInverso);
        $this->assertSame('ajuste', $kardexInverso->first()->motivo);

        $this->assertNotNull(Venta::sinTenant()->find($venta->id));
        $this->assertSame(2, VentaDetalle::sinTenant()->where('venta_id', $venta->id)->count());
    }

    public function test_cerrar_caja_excluye_venta_anulada_y_aplica_formula_apertura_mas_ventas_menos_gastos(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $caja = $this->cajaService->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);

        $ventaA = $this->ventaService->registrarVenta(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'usuario_id' => $ctx['usuario']->id, 'cliente_id' => $ctx['cliente']->id],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 2],
                ['variante_id' => $ctx['varianteB']->id, 'cantidad' => 3],
            ],
            [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 350]],
        );
        $this->ventaService->registrarVenta(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'usuario_id' => $ctx['usuario']->id, 'cliente_id' => $ctx['cliente']->id],
            [['variante_id' => $ctx['varianteB']->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 50]],
        );

        // A queda anulada -- no debe contar en total_ventas_sistema.
        $this->ventaService->anularVenta($ventaA, 'Cliente se arrepintio', $ctx['usuario']);

        // total_teorico = apertura(500) + ventas(50, solo B) - gastos(0) = 550.
        $cajaCerrada = $this->cajaService->cerrarCaja($caja, 545);

        $this->assertSame(50.0, (float) $cajaCerrada->total_ventas_sistema);
        $this->assertSame(-5.0, (float) $cajaCerrada->diferencia);
        $this->assertSame('cerrada', $cajaCerrada->estado);
        $this->assertSame(545.0, (float) $cajaCerrada->monto_cierre);
    }

    public function test_aislamiento_tenant_en_caja_venta_pagos_y_detalles(): void
    {
        $ctx1 = $this->prepararTenantConCatalogo();
        $caja1 = $this->cajaService->abrirCaja($ctx1['sucursal']->id, $ctx1['usuario']->id, 500);
        $venta1 = $this->ventaService->registrarVenta(
            ['tenant_id' => $ctx1['tenant']->id, 'sucursal_id' => $ctx1['sucursal']->id, 'usuario_id' => $ctx1['usuario']->id, 'cliente_id' => $ctx1['cliente']->id],
            [['variante_id' => $ctx1['varianteA']->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $ctx1['efectivo']->id, 'monto' => 100]],
        );

        $tenant2 = Tenant::create(['nombre' => 'Angara Dental', 'pais' => 'MX']);
        $sucursal2 = Sucursal::create(['tenant_id' => $tenant2->id, 'nombre' => 'Matriz']);
        Usuario::create([
            'tenant_id' => $tenant2->id, 'sucursal_id' => $sucursal2->id,
            'nombre' => 'Beto', 'correo' => 'beto@test.com', 'password' => 'secret123',
        ]);

        app(TenantContext::class)->set($tenant2);

        $this->assertNull(CajaSesion::find($caja1->id));
        $this->assertNull(Venta::find($venta1->id));
        $this->assertSame(0, Venta::all()->count());
        $this->assertNull(VentaPago::find($venta1->pagos->first()->id));
        $this->assertFalse(VentaDetalle::where('venta_id', $venta1->id)->exists());

        $this->assertSame(1, CajaSesion::sinTenant()->count());
        $this->assertSame(1, Venta::sinTenant()->count());
    }
}
