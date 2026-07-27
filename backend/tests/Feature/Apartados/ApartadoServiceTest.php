<?php

namespace Tests\Feature\Apartados;

use App\Modules\Apartados\Exceptions\AbonoPagoNoCuadraException;
use App\Modules\Apartados\Exceptions\ApartadoEstadoInvalidoException;
use App\Modules\Apartados\Exceptions\ApartadoSaldoInsuficienteException;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Models\ApartadoAbonoPago;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Crm\Models\Cliente;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Convertido del guion manual test_apartados.php usado para validar el
 * modulo Apartados contra MySQL real.
 */
class ApartadoServiceTest extends TestCase
{
    use RefreshDatabase;

    private ApartadoService $apartadoService;

    private InventarioService $inventarioService;

    private CajaService $cajaService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apartadoService = app(ApartadoService::class);
        $this->inventarioService = app(InventarioService::class);
        $this->cajaService = app(CajaService::class);
    }

    /**
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente,
     *     efectivo: MetodoPago, tarjeta: MetodoPago, varianteC: ProductoVariante, varianteD: ProductoVariante}
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
        $productoC = Producto::create([
            'tenant_id' => $tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Sudadera', 'precio_compra' => 100, 'precio_venta' => 200,
        ]);
        $varianteC = ProductoVariante::create(['producto_id' => $productoC->id, 'talla' => 'L']);
        $productoD = Producto::create([
            'tenant_id' => $tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Bufanda', 'precio_compra' => 40, 'precio_venta' => 80,
        ]);
        $varianteD = ProductoVariante::create(['producto_id' => $productoD->id, 'talla' => 'Unica']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);

        $this->inventarioService->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [
                ['variante_id' => $varianteC->id, 'cantidad' => 15, 'precio_compra' => 100],
                ['variante_id' => $varianteD->id, 'cantidad' => 15, 'precio_compra' => 40],
            ],
        );

        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'efectivo', 'tarjeta', 'varianteC', 'varianteD');
    }

    public function test_crear_apartado_reserva_stock_descontando_inventario(): void
    {
        $ctx = $this->prepararTenantConCatalogo();

        $apartado = $this->apartadoService->crearApartado(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'cliente_id' => $ctx['cliente']->id, 'usuario_id' => $ctx['usuario']->id],
            [
                ['variante_id' => $ctx['varianteC']->id, 'cantidad' => 2],
                ['variante_id' => $ctx['varianteD']->id, 'cantidad' => 1],
            ],
        );

        $this->assertSame(480.0, (float) $apartado->total);
        $this->assertSame('activo', $apartado->estado);
        $this->assertCount(2, $apartado->detalles);

        $this->assertSame(13, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteC']->id)->first()->stock_actual);
        $this->assertSame(14, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteD']->id)->first()->stock_actual);
        $this->assertSame(
            2,
            Kardex::sinTenant()->where('referencia_tabla', 'apartados')->where('referencia_id', $apartado->id)
                ->where('tipo', 'salida')->where('motivo', 'apartado')->count(),
        );
    }

    public function test_registrar_abonos_parciales_con_pago_mixto_y_rechaza_abono_que_no_cuadra(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $apartado = $this->apartadoService->crearApartado(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'cliente_id' => $ctx['cliente']->id, 'usuario_id' => $ctx['usuario']->id],
            [['variante_id' => $ctx['varianteC']->id, 'cantidad' => 2], ['variante_id' => $ctx['varianteD']->id, 'cantidad' => 1]],
        );

        $abono1 = $this->apartadoService->registrarAbono($apartado, 200, $ctx['usuario']->id, [
            ['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 150],
            ['metodo_pago_id' => $ctx['tarjeta']->id, 'monto' => 50],
        ]);
        $this->assertCount(2, $abono1->pagos);
        $this->assertSame(200.0, (float) $apartado->fresh()->total_abonado);

        try {
            $this->apartadoService->registrarAbono($apartado, 100, $ctx['usuario']->id, [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 99]]);
            $this->fail('Se esperaba AbonoPagoNoCuadraException.');
        } catch (AbonoPagoNoCuadraException) {
            // esperado
        }
        $this->assertSame(200.0, (float) $apartado->fresh()->total_abonado);

        $this->apartadoService->registrarAbono($apartado, 280, $ctx['usuario']->id, [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 280]]);
        $this->assertSame(480.0, (float) $apartado->fresh()->total_abonado);
    }

    public function test_liquidar_apartado_crea_venta_con_abono_previo_sin_descontar_stock_dos_veces(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $apartado = $this->apartadoService->crearApartado(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'cliente_id' => $ctx['cliente']->id, 'usuario_id' => $ctx['usuario']->id],
            [['variante_id' => $ctx['varianteC']->id, 'cantidad' => 2], ['variante_id' => $ctx['varianteD']->id, 'cantidad' => 1]],
        );
        $this->apartadoService->registrarAbono($apartado, 480, $ctx['usuario']->id, [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 480]]);

        $stockCTrasReserva = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteC']->id)->first()->stock_actual;
        $stockDTrasReserva = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteD']->id)->first()->stock_actual;

        $this->cajaService->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 0);

        $apartadoLiquidado = $this->apartadoService->liquidar($apartado, $ctx['usuario']->id);

        $this->assertSame('completado', $apartadoLiquidado->estado);
        $this->assertNotNull($apartadoLiquidado->fecha_completado);
        $this->assertNotNull($apartadoLiquidado->venta_id);

        $venta = Venta::sinTenant()->findOrFail($apartadoLiquidado->venta_id);
        $this->assertSame(480.0, (float) $venta->total);
        $this->assertSame(480.0, (float) $venta->abono_previo);
        $this->assertSame(0, $venta->pagos()->count());
        $this->assertSame(2, $venta->detalles()->count());

        // Reservado y luego liberado+re-vendido: el stock final debe quedar
        // exactamente donde estaba tras la reserva -- no descontado dos veces.
        $this->assertSame($stockCTrasReserva, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteC']->id)->first()->stock_actual);
        $this->assertSame($stockDTrasReserva, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteD']->id)->first()->stock_actual);

        $this->assertSame(
            4,
            Kardex::sinTenant()->where('referencia_tabla', 'apartados')->where('referencia_id', $apartado->id)->count(),
        );
        $this->assertSame(
            2,
            Kardex::sinTenant()->where('referencia_tabla', 'ventas')->where('referencia_id', $venta->id)->count(),
        );

        try {
            $this->apartadoService->liquidar($apartado, $ctx['usuario']->id);
            $this->fail('Se esperaba ApartadoEstadoInvalidoException al re-liquidar.');
        } catch (ApartadoEstadoInvalidoException) {
            // esperado
        }
    }

    public function test_liquidar_con_saldo_insuficiente_es_rechazado(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $apartado = $this->apartadoService->crearApartado(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'cliente_id' => $ctx['cliente']->id, 'usuario_id' => $ctx['usuario']->id],
            [['variante_id' => $ctx['varianteC']->id, 'cantidad' => 1]],
        );
        $this->apartadoService->registrarAbono($apartado, 100, $ctx['usuario']->id, [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]]);

        try {
            $this->apartadoService->liquidar($apartado, $ctx['usuario']->id);
            $this->fail('Se esperaba ApartadoSaldoInsuficienteException.');
        } catch (ApartadoSaldoInsuficienteException) {
            // esperado
        }

        $this->assertSame('activo', $apartado->fresh()->estado);
    }

    public function test_cancelar_apartado_libera_stock_y_señala_abonos_pendientes(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $apartado = $this->apartadoService->crearApartado(
            ['tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id, 'cliente_id' => $ctx['cliente']->id, 'usuario_id' => $ctx['usuario']->id],
            [['variante_id' => $ctx['varianteC']->id, 'cantidad' => 1]],
        );
        $this->apartadoService->registrarAbono($apartado, 100, $ctx['usuario']->id, [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]]);

        $stockAntesCancelar = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteC']->id)->first()->stock_actual;

        $resultado = $this->apartadoService->cancelar($apartado, 'Cliente ya no lo quiere', $ctx['usuario']);

        $this->assertSame('cancelado', $resultado->apartado->estado);
        $this->assertNotNull($resultado->apartado->fecha_cancelado);
        $this->assertSame('Cliente ya no lo quiere', $resultado->apartado->motivo_cancelacion);
        $this->assertSame($ctx['usuario']->id, $resultado->apartado->usuario_cancelacion_id);

        $this->assertSame($stockAntesCancelar + 1, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteC']->id)->first()->stock_actual);

        $this->assertTrue($resultado->tieneAbonosPendientes);
        $this->assertSame(100.0, $resultado->montoAbonadoPendiente);
        $this->assertSame(1, ApartadoAbono::sinTenant()->where('apartado_id', $apartado->id)->count());

        try {
            $this->apartadoService->registrarAbono($apartado, 50, $ctx['usuario']->id, [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 50]]);
            $this->fail('Se esperaba ApartadoEstadoInvalidoException al abonar a un apartado cancelado.');
        } catch (ApartadoEstadoInvalidoException) {
            // esperado
        }
    }

    public function test_aislamiento_tenant_en_apartado_detalle_abono_y_abono_pago(): void
    {
        $ctx1 = $this->prepararTenantConCatalogo();
        $apartado1 = $this->apartadoService->crearApartado(
            ['tenant_id' => $ctx1['tenant']->id, 'sucursal_id' => $ctx1['sucursal']->id, 'cliente_id' => $ctx1['cliente']->id, 'usuario_id' => $ctx1['usuario']->id],
            [['variante_id' => $ctx1['varianteC']->id, 'cantidad' => 1]],
        );
        $abono1 = $this->apartadoService->registrarAbono($apartado1, 50, $ctx1['usuario']->id, [['metodo_pago_id' => $ctx1['efectivo']->id, 'monto' => 50]]);

        $tenant2 = Tenant::create(['nombre' => 'Angara Dental', 'pais' => 'MX']);
        $sucursal2 = Sucursal::create(['tenant_id' => $tenant2->id, 'nombre' => 'Matriz']);
        Usuario::create([
            'tenant_id' => $tenant2->id, 'sucursal_id' => $sucursal2->id,
            'nombre' => 'Beto', 'correo' => 'beto@test.com', 'password' => 'secret123',
        ]);

        app(TenantContext::class)->set($tenant2);

        $this->assertNull(Apartado::find($apartado1->id));
        $this->assertSame(0, Apartado::all()->count());
        $this->assertFalse(ApartadoDetalle::where('apartado_id', $apartado1->id)->exists());
        $this->assertNull(ApartadoAbono::find($abono1->id));
        $this->assertFalse(ApartadoAbonoPago::where('abono_id', $abono1->id)->exists());

        $this->assertSame(1, Apartado::sinTenant()->count());
        $this->assertSame(1, ApartadoAbono::sinTenant()->count());
    }
}
