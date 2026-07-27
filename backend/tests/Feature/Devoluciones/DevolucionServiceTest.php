<?php

namespace Tests\Feature\Devoluciones;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException;
use App\Modules\Devoluciones\Exceptions\DevolucionSobreVentaSombraException;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Devoluciones\Services\DevolucionService;
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
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Convertido del guion manual test_devoluciones.php usado para validar el
 * modulo Devoluciones contra MySQL real.
 */
class DevolucionServiceTest extends TestCase
{
    use RefreshDatabase;

    private DevolucionService $devolucionService;

    private VentaService $ventaService;

    private CajaService $cajaService;

    private InventarioService $inventarioService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->devolucionService = app(DevolucionService::class);
        $this->ventaService = app(VentaService::class);
        $this->cajaService = app(CajaService::class);
        $this->inventarioService = app(InventarioService::class);
    }

    /**
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente,
     *     efectivo: MetodoPago, varianteE: ProductoVariante, varianteF: ProductoVariante,
     *     varianteG: ProductoVariante, ventaOrigen: Venta}
     */
    private function prepararTenantConVentaOrigen(): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX']);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => 'ana@test.com', 'password' => 'secret123',
        ]);

        app(TenantContext::class)->set($tenant);

        $efectivo = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Ropa']);
        $productoE = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Camisa', 'precio_compra' => 60, 'precio_venta' => 120]);
        $varianteE = ProductoVariante::create(['producto_id' => $productoE->id, 'talla' => 'M']);
        $productoF = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Corbata', 'precio_compra' => 30, 'precio_venta' => 60]);
        $varianteF = ProductoVariante::create(['producto_id' => $productoF->id, 'talla' => 'Unica']);
        $productoG = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Saco', 'precio_compra' => 200, 'precio_venta' => 400]);
        $varianteG = ProductoVariante::create(['producto_id' => $productoG->id, 'talla' => 'L']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);

        $this->inventarioService->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [
                ['variante_id' => $varianteE->id, 'cantidad' => 10, 'precio_compra' => 60],
                ['variante_id' => $varianteF->id, 'cantidad' => 10, 'precio_compra' => 30],
                ['variante_id' => $varianteG->id, 'cantidad' => 10, 'precio_compra' => 200],
            ],
        );

        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        $this->cajaService->abrirCaja($sucursal->id, $usuario->id, 0);

        // Venta origen: E x2 (120 c/u) + F x1 (60) = 300.
        $ventaOrigen = $this->ventaService->registrarVenta(
            ['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id, 'cliente_id' => $cliente->id],
            [
                ['variante_id' => $varianteE->id, 'cantidad' => 2],
                ['variante_id' => $varianteF->id, 'cantidad' => 1],
            ],
            [['metodo_pago_id' => $efectivo->id, 'monto' => 300]],
        );

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'efectivo', 'varianteE', 'varianteF', 'varianteG', 'ventaOrigen');
    }

    public function test_devolucion_simple_regresa_stock_y_registra_reembolso(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();

        $devolucion = $this->devolucionService->registrarDevolucion(
            ventaOrigen: $ctx['ventaOrigen'],
            tipo: 'devolucion',
            itemsDevueltos: [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            itemsNuevos: [],
            sucursalId: $ctx['sucursal']->id,
            usuarioId: $ctx['usuario']->id,
            pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 120]],
            motivo: 'Talla incorrecta',
        );

        $this->assertSame('devolucion', $devolucion->tipo);
        $this->assertSame(120.0, (float) $devolucion->monto_devolucion);
        $this->assertSame(-120.0, (float) $devolucion->diferencia);
        $this->assertNull($devolucion->venta_sombra_id);
        $this->assertCount(1, $devolucion->items);
        $this->assertSame('devuelto', $devolucion->items->first()->tipo);
        $this->assertSame(120.0, (float) $devolucion->pagos->sum('monto'));

        $this->assertSame(9, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteE']->id)->first()->stock_actual);
        $this->assertSame(
            1,
            Kardex::sinTenant()->where('referencia_tabla', 'devoluciones')->where('referencia_id', $devolucion->id)
                ->where('tipo', 'entrada')->where('motivo', 'devolucion')->count(),
        );
    }

    public function test_devolucion_con_va_a_merma_no_regresa_stock_ni_genera_kardex(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $stockFAntes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteF']->id)->first()->stock_actual;

        $devolucion = $this->devolucionService->registrarDevolucion(
            ventaOrigen: $ctx['ventaOrigen'],
            tipo: 'devolucion',
            itemsDevueltos: [['variante_id' => $ctx['varianteF']->id, 'cantidad' => 1, 'va_a_merma' => true]],
            itemsNuevos: [],
            sucursalId: $ctx['sucursal']->id,
            usuarioId: $ctx['usuario']->id,
            pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 60]],
            motivo: 'Llego danada',
        );

        $this->assertTrue($devolucion->items->first()->va_a_merma);
        $this->assertSame($stockFAntes, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteF']->id)->first()->stock_actual);
        $this->assertSame(0, Kardex::sinTenant()->where('referencia_tabla', 'devoluciones')->where('referencia_id', $devolucion->id)->count());
    }

    public function test_cambio_completo_crea_venta_sombra_con_cobro_adicional_y_sin_pagos_propios(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $stockGAntes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteG']->id)->first()->stock_actual;
        $stockEAntes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteE']->id)->first()->stock_actual;

        $devolucion = $this->devolucionService->registrarDevolucion(
            ventaOrigen: $ctx['ventaOrigen'],
            tipo: 'cambio',
            itemsDevueltos: [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            itemsNuevos: [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1]],
            sucursalId: $ctx['sucursal']->id,
            usuarioId: $ctx['usuario']->id,
            pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 280]],
            motivo: 'Cliente prefirio el saco',
        );

        $this->assertSame('cambio', $devolucion->tipo);
        $this->assertSame(120.0, (float) $devolucion->monto_devolucion);
        $this->assertSame(400.0, (float) $devolucion->monto_cambio);
        $this->assertSame(280.0, (float) $devolucion->diferencia);

        $ventaSombra = Venta::sinTenant()->findOrFail($devolucion->venta_sombra_id);
        $this->assertTrue($ventaSombra->es_venta_sombra);
        $this->assertSame(400.0, (float) $ventaSombra->total);
        $this->assertSame(400.0, (float) $ventaSombra->abono_previo);
        $this->assertSame(0, $ventaSombra->pagos()->count());
        $this->assertSame($ctx['ventaOrigen']->cliente_id, $ventaSombra->cliente_id);

        $this->assertSame($stockGAntes - 1, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteG']->id)->first()->stock_actual);
        $this->assertSame($stockEAntes + 1, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteE']->id)->first()->stock_actual);

        $this->assertCount(2, $devolucion->items);
        $this->assertSame(1, $devolucion->items->where('tipo', 'devuelto')->count());
        $this->assertSame(1, $devolucion->items->where('tipo', 'nuevo')->count());
        $this->assertSame(280.0, (float) $devolucion->pagos->sum('monto'));
    }

    public function test_cantidad_devuelta_mayor_a_lo_vendido_es_rechazada(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();

        try {
            $this->devolucionService->registrarDevolucion(
                ventaOrigen: $ctx['ventaOrigen'],
                tipo: 'cambio',
                itemsDevueltos: [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 100, 'va_a_merma' => false]],
                itemsNuevos: [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1]],
                sucursalId: $ctx['sucursal']->id,
                usuarioId: $ctx['usuario']->id,
                pagos: [],
            );
            $this->fail('Se esperaba InvalidArgumentException.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('solo vendio', $e->getMessage());
        }

        $this->assertSame(0, Devolucion::sinTenant()->count());
    }

    public function test_venta_sombra_no_puede_originar_devolucion_normal(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $devolucionCambio = $this->devolucionService->registrarDevolucion(
            ventaOrigen: $ctx['ventaOrigen'],
            tipo: 'cambio',
            itemsDevueltos: [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            itemsNuevos: [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1]],
            sucursalId: $ctx['sucursal']->id,
            usuarioId: $ctx['usuario']->id,
            pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 280]],
        );
        $ventaSombra = Venta::sinTenant()->findOrFail($devolucionCambio->venta_sombra_id);
        $devolucionesAntes = Devolucion::sinTenant()->count();

        try {
            $this->devolucionService->registrarDevolucion(
                ventaOrigen: $ventaSombra,
                tipo: 'devolucion',
                itemsDevueltos: [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1, 'va_a_merma' => false]],
                itemsNuevos: [],
                sucursalId: $ctx['sucursal']->id,
                usuarioId: $ctx['usuario']->id,
                pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 400]],
            );
            $this->fail('Se esperaba DevolucionSobreVentaSombraException.');
        } catch (DevolucionSobreVentaSombraException $e) {
            $this->assertSame($ventaSombra->id, $e->ventaId);
        }

        $this->assertSame($devolucionesAntes, Devolucion::sinTenant()->count());
    }

    public function test_venta_sombra_si_puede_originar_cambio_recursivo(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $devolucionCambio = $this->devolucionService->registrarDevolucion(
            ventaOrigen: $ctx['ventaOrigen'],
            tipo: 'cambio',
            itemsDevueltos: [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            itemsNuevos: [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1]],
            sucursalId: $ctx['sucursal']->id,
            usuarioId: $ctx['usuario']->id,
            pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 280]],
        );
        $ventaSombra = Venta::sinTenant()->findOrFail($devolucionCambio->venta_sombra_id);
        $stockGAntes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteG']->id)->first()->stock_actual;

        // Cambio de un cambio: devuelve G (400) x1, entrega F (60) x1 -> diferencia -340 (reembolso).
        $devolucionRecursiva = $this->devolucionService->registrarDevolucion(
            ventaOrigen: $ventaSombra,
            tipo: 'cambio',
            itemsDevueltos: [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            itemsNuevos: [['variante_id' => $ctx['varianteF']->id, 'cantidad' => 1]],
            sucursalId: $ctx['sucursal']->id,
            usuarioId: $ctx['usuario']->id,
            pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 340]],
        );

        $this->assertSame($ventaSombra->id, $devolucionRecursiva->venta_id);
        $this->assertSame(-340.0, (float) $devolucionRecursiva->diferencia);
        $this->assertNotNull($devolucionRecursiva->venta_sombra_id);
        $this->assertTrue(Venta::sinTenant()->findOrFail($devolucionRecursiva->venta_sombra_id)->es_venta_sombra);
        $this->assertSame($stockGAntes + 1, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteG']->id)->first()->stock_actual);
    }

    public function test_pago_que_no_cuadra_con_la_diferencia_es_rechazado(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $devolucionesAntes = Devolucion::sinTenant()->count();

        try {
            $this->devolucionService->registrarDevolucion(
                ventaOrigen: $ctx['ventaOrigen'],
                tipo: 'devolucion',
                itemsDevueltos: [['variante_id' => $ctx['varianteF']->id, 'cantidad' => 1, 'va_a_merma' => false]],
                itemsNuevos: [],
                sucursalId: $ctx['sucursal']->id,
                usuarioId: $ctx['usuario']->id,
                pagos: [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 10]],
            );
            $this->fail('Se esperaba DevolucionPagoNoCuadraException.');
        } catch (DevolucionPagoNoCuadraException) {
            // esperado
        }

        $this->assertSame($devolucionesAntes, Devolucion::sinTenant()->count());
    }

    public function test_aislamiento_tenant_en_devolucion_item_y_pago(): void
    {
        $ctx1 = $this->prepararTenantConVentaOrigen();
        $devolucion1 = $this->devolucionService->registrarDevolucion(
            ventaOrigen: $ctx1['ventaOrigen'],
            tipo: 'devolucion',
            itemsDevueltos: [['variante_id' => $ctx1['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            itemsNuevos: [],
            sucursalId: $ctx1['sucursal']->id,
            usuarioId: $ctx1['usuario']->id,
            pagos: [['metodo_pago_id' => $ctx1['efectivo']->id, 'monto' => 120]],
        );

        $tenant2 = Tenant::create(['nombre' => 'Angara Dental', 'pais' => 'MX']);
        $sucursal2 = Sucursal::create(['tenant_id' => $tenant2->id, 'nombre' => 'Matriz']);
        Usuario::create([
            'tenant_id' => $tenant2->id, 'sucursal_id' => $sucursal2->id,
            'nombre' => 'Beto', 'correo' => 'beto@test.com', 'password' => 'secret123',
        ]);

        app(TenantContext::class)->set($tenant2);

        $this->assertNull(Devolucion::find($devolucion1->id));
        $this->assertSame(0, Devolucion::all()->count());
        $this->assertFalse(DevolucionItem::where('devolucion_id', $devolucion1->id)->exists());
        $this->assertFalse(DevolucionPago::where('devolucion_id', $devolucion1->id)->exists());

        $this->assertSame(1, Devolucion::sinTenant()->count());
    }
}
