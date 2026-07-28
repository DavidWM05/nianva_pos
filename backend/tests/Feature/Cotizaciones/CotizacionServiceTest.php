<?php

namespace Tests\Feature\Cotizaciones;

use App\Modules\Cotizaciones\Exceptions\CotizacionVencidaException;
use App\Modules\Cotizaciones\Exceptions\SinClienteException;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CotizacionServiceTest extends TestCase
{
    use RefreshDatabase;

    private CotizacionService $cotizacionService;
    private InventarioService $inventarioService;
    private CajaService $cajaService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->cotizacionService = app(CotizacionService::class);
        $this->inventarioService = app(InventarioService::class);
        $this->cajaService = app(CajaService::class);
    }

    /**
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente, varianteA: ProductoVariante, varianteB: ProductoVariante, efectivo: MetodoPago}
     */
    private function prepararEscenario(): array
    {
        $tenant = Tenant::create(['nombre' => 'Test Cotizaciones', 'pais' => 'MX']);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Principal']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Juan', 'correo' => 'juan@test.com', 'password' => 'secret123',
        ]);

        app(TenantContext::class)->set($tenant);

        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        $efectivo = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Test']);
        $producto = Producto::create([
            'tenant_id' => $tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Producto Test', 'precio_compra' => 50, 'precio_venta' => 100,
        ]);
        $varianteA = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'M']);
        $varianteB = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'L']);

        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Proveedor Test']);

        $this->inventarioService->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [
                ['variante_id' => $varianteA->id, 'cantidad' => 20, 'precio_compra' => 50],
                ['variante_id' => $varianteB->id, 'cantidad' => 10, 'precio_compra' => 50],
            ],
        );

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'varianteA', 'varianteB', 'efectivo');
    }

    public function test_crear_cotizacion_no_modifica_stock(): void
    {
        $ctx = $this->prepararEscenario();

        $stockAntes = InventarioStock::sinTenant()
            ->where('variante_id', $ctx['varianteA']->id)
            ->first()
            ->stock_actual;

        $cotizacion = $this->cotizacionService->crear(
            [
                'tenant_id' => $ctx['tenant']->id,
                'sucursal_id' => $ctx['sucursal']->id,
                'usuario_id' => $ctx['usuario']->id,
                'cliente_id' => $ctx['cliente']->id,
                'validez_dias' => 15,
                'descuento' => 0,
            ],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 5, 'precio_unitario' => 100, 'descuento' => 0],
                ['variante_id' => $ctx['varianteB']->id, 'cantidad' => 3, 'precio_unitario' => 80, 'descuento' => 10],
            ],
        );

        $this->assertSame('pendiente', $cotizacion->estado);
        $this->assertStringStartsWith('COT-', $cotizacion->numero_cotizacion);
        $this->assertCount(2, $cotizacion->detalles);

        // Stock no se modifica
        $stockDespues = InventarioStock::sinTenant()
            ->where('variante_id', $ctx['varianteA']->id)
            ->first()
            ->stock_actual;
        $this->assertSame($stockAntes, $stockDespues);

        // Verificar total: (5*100) + (3*80-10) = 500 + 230 = 730
        $this->assertSame(730.0, (float) $cotizacion->total);
    }

    public function test_anular_cotizacion_solo_si_pendiente(): void
    {
        $ctx = $this->prepararEscenario();

        $cotizacion = $this->cotizacionService->crear(
            [
                'tenant_id' => $ctx['tenant']->id,
                'sucursal_id' => $ctx['sucursal']->id,
                'usuario_id' => $ctx['usuario']->id,
                'cliente_id' => $ctx['cliente']->id,
                'validez_dias' => 15,
                'descuento' => 0,
            ],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1, 'precio_unitario' => 100, 'descuento' => 0],
            ],
        );

        $this->cotizacionService->anular($cotizacion->id);

        $this->assertSame('anulada', $cotizacion->fresh()->estado);
    }

    public function test_convertir_cotizacion_crea_venta_y_cambia_estado(): void
    {
        $ctx = $this->prepararEscenario();

        $cotizacion = $this->cotizacionService->crear(
            [
                'tenant_id' => $ctx['tenant']->id,
                'sucursal_id' => $ctx['sucursal']->id,
                'usuario_id' => $ctx['usuario']->id,
                'cliente_id' => $ctx['cliente']->id,
                'validez_dias' => 15,
                'descuento' => 0,
            ],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 2, 'precio_unitario' => 100, 'descuento' => 0],
            ],
        );

        $this->cajaService->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);

        $venta = $this->cotizacionService->convertirAVenta($cotizacion->id, [
            'usuario_id' => $ctx['usuario']->id,
            'metodo_pago_id' => $ctx['efectivo']->id,
        ]);

        $cotizacionActualizada = $cotizacion->fresh();

        $this->assertSame('convertida', $cotizacionActualizada->estado);
        $this->assertSame($venta->id, $cotizacionActualizada->venta_id);
        $this->assertSame(200.0, (float) $venta->total);
        $this->assertSame('completada', $venta->fresh()->estado);

        // Stock se descuenta solo al convertir
        $stock = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteA']->id)->first();
        $this->assertSame(18, $stock->stock_actual);
    }

    public function test_convertir_sin_cliente_lanza_excepcion(): void
    {
        $ctx = $this->prepararEscenario();

        $cotizacion = $this->cotizacionService->crear(
            [
                'tenant_id' => $ctx['tenant']->id,
                'sucursal_id' => $ctx['sucursal']->id,
                'usuario_id' => $ctx['usuario']->id,
                'cliente_id' => null,
                'validez_dias' => 15,
                'descuento' => 0,
            ],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1, 'precio_unitario' => 100, 'descuento' => 0],
            ],
        );

        $this->expectException(SinClienteException::class);
        $this->cotizacionService->convertirAVenta($cotizacion->id, [
            'usuario_id' => $ctx['usuario']->id,
            'metodo_pago_id' => $ctx['efectivo']->id,
        ]);
    }

    public function test_convertir_cotizacion_vencida_lanza_excepcion(): void
    {
        $ctx = $this->prepararEscenario();

        $cotizacion = $this->cotizacionService->crear(
            [
                'tenant_id' => $ctx['tenant']->id,
                'sucursal_id' => $ctx['sucursal']->id,
                'usuario_id' => $ctx['usuario']->id,
                'cliente_id' => $ctx['cliente']->id,
                'validez_dias' => -1,
                'descuento' => 0,
            ],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1, 'precio_unitario' => 100, 'descuento' => 0],
            ],
        );

        // Forzar fecha de vencimiento en el pasado
        $cotizacion->update(['fecha_vencimiento' => now()->subDay()->toDateString()]);

        $this->expectException(CotizacionVencidaException::class);
        $this->cotizacionService->convertirAVenta($cotizacion->id, [
            'usuario_id' => $ctx['usuario']->id,
            'metodo_pago_id' => $ctx['efectivo']->id,
        ]);
    }

    public function test_aislamiento_de_tenant_en_cotizaciones(): void
    {
        $ctx = $this->prepararEscenario();

        $this->cotizacionService->crear(
            [
                'tenant_id' => $ctx['tenant']->id,
                'sucursal_id' => $ctx['sucursal']->id,
                'usuario_id' => $ctx['usuario']->id,
                'cliente_id' => $ctx['cliente']->id,
                'validez_dias' => 15,
                'descuento' => 0,
            ],
            [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1, 'precio_unitario' => 100, 'descuento' => 0],
            ],
        );

        // Cambiar a otro tenant
        $tenant2 = Tenant::create(['nombre' => 'Otro Tenant', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, Cotizacion::all()->count());
        $this->assertSame(1, Cotizacion::sinTenant()->count());
    }
}
