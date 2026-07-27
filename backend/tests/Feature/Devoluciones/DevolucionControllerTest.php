<?php

namespace Tests\Feature\Devoluciones;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\InventarioStock;
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

class DevolucionControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente,
     *     efectivo: MetodoPago, tarjeta: MetodoPago, varianteE: ProductoVariante, varianteF: ProductoVariante,
     *     varianteG: ProductoVariante, ventaOrigenId: int}
     */
    private function prepararTenantConVentaOrigen(
        array $permisos = ['devoluciones.ver', 'devoluciones.crear'],
    ): array {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => uniqid('ana-').'@test.com', 'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($tenant);

        if ($permisos !== []) {
            $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-de-prueba-'.uniqid(), 'es_sistema' => false]);
            $ids = collect($permisos)->map(function (string $nombre) {
                [$modulo, $accion] = explode('.', $nombre);

                return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
            });
            $rol->permisos()->attach($ids);
            $usuario->roles()->attach($rol->id);
        }

        $efectivo = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        $tarjeta = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Tarjeta', 'tipo' => 'tarjeta']);

        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Ropa']);
        $productoE = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Camisa', 'precio_compra' => 60, 'precio_venta' => 120]);
        $varianteE = ProductoVariante::create(['producto_id' => $productoE->id, 'talla' => 'M']);
        $productoF = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Corbata', 'precio_compra' => 30, 'precio_venta' => 60]);
        $varianteF = ProductoVariante::create(['producto_id' => $productoF->id, 'talla' => 'Unica']);
        $productoG = Producto::create(['tenant_id' => $tenant->id, 'categoria_id' => $categoria->id, 'nombre' => 'Saco', 'precio_compra' => 200, 'precio_venta' => 400]);
        $varianteG = ProductoVariante::create(['producto_id' => $productoG->id, 'talla' => 'L']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);

        app(InventarioService::class)->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [
                ['variante_id' => $varianteE->id, 'cantidad' => 10, 'precio_compra' => 60],
                ['variante_id' => $varianteF->id, 'cantidad' => 10, 'precio_compra' => 30],
                ['variante_id' => $varianteG->id, 'cantidad' => 10, 'precio_compra' => 200],
            ],
        );

        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 0);

        // Venta origen: E x2 (120 c/u) + F x1 (60) = 300.
        $ventaOrigen = app(VentaService::class)->registrarVenta(
            ['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id, 'cliente_id' => $cliente->id],
            [
                ['variante_id' => $varianteE->id, 'cantidad' => 2],
                ['variante_id' => $varianteF->id, 'cantidad' => 1],
            ],
            [['metodo_pago_id' => $efectivo->id, 'monto' => 300]],
        );

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'efectivo', 'tarjeta', 'varianteE', 'varianteF', 'varianteG')
            + ['ventaOrigenId' => $ventaOrigen->id];
    }

    public function test_store_devolucion_simple_regresa_stock_y_registra_reembolso(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/devoluciones', [
            'venta_id' => $ctx['ventaOrigenId'],
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 120]],
            'motivo' => 'Talla incorrecta',
        ]);

        $respuesta->assertCreated()
            ->assertJsonPath('data.tipo', 'devolucion')
            ->assertJsonPath('data.diferencia', '-120.00')
            ->assertJsonPath('data.venta_sombra_id', null)
            ->assertJsonCount(1, 'data.items');

        $this->assertSame(9, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteE']->id)->first()->stock_actual);
    }

    public function test_store_con_merma_no_regresa_stock(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $this->actingAs($ctx['usuario']);

        $stockAntes = InventarioStock::sinTenant()->where('variante_id', $ctx['varianteE']->id)->first()->stock_actual;

        $this->postJson('/api/devoluciones', [
            'venta_id' => $ctx['ventaOrigenId'],
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => true]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 120]],
        ])->assertCreated()->assertJsonPath('data.items.0.va_a_merma', true);

        $this->assertSame($stockAntes, InventarioStock::sinTenant()->where('variante_id', $ctx['varianteE']->id)->first()->stock_actual);
    }

    public function test_store_cambio_crea_venta_sombra_y_agrega_items_nuevos(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/devoluciones', [
            'venta_id' => $ctx['ventaOrigenId'],
            'tipo' => 'cambio',
            'items_devueltos' => [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'items_nuevos' => [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 280]],
            'motivo' => 'Cliente prefirio el saco',
        ]);

        $respuesta->assertCreated()
            ->assertJsonPath('data.tipo', 'cambio')
            ->assertJsonPath('data.monto_devolucion', '120.00')
            ->assertJsonPath('data.monto_cambio', '400.00')
            ->assertJsonPath('data.diferencia', '280.00')
            ->assertJsonCount(2, 'data.items');

        $this->assertNotNull($respuesta->json('data.venta_sombra_id'));
    }

    public function test_store_sobre_venta_sombra_con_tipo_devolucion_devuelve_422_con_error_code(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $this->actingAs($ctx['usuario']);

        $cambio = $this->postJson('/api/devoluciones', [
            'venta_id' => $ctx['ventaOrigenId'],
            'tipo' => 'cambio',
            'items_devueltos' => [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'items_nuevos' => [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 280]],
        ])->json('data');

        $this->postJson('/api/devoluciones', [
            'venta_id' => $cambio['venta_sombra_id'],
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $ctx['varianteG']->id, 'cantidad' => 1, 'va_a_merma' => false]],
        ])->assertStatus(422)->assertJsonPath('error_code', 'devolucion_sobre_venta_sombra');
    }

    public function test_store_con_pago_que_no_cuadra_devuelve_422_con_error_code(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $this->actingAs($ctx['usuario']);

        $this->postJson('/api/devoluciones', [
            'venta_id' => $ctx['ventaOrigenId'],
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 50]],
        ])->assertStatus(422)->assertJsonPath('error_code', 'devolucion_pago_no_cuadra');

        $this->assertSame(0, Devolucion::count());
    }

    public function test_store_sin_permiso_devuelve_403(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen([]);
        $this->actingAs($ctx['usuario']);

        $this->postJson('/api/devoluciones', [
            'venta_id' => $ctx['ventaOrigenId'],
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 120]],
        ])->assertForbidden();
    }

    public function test_index_lista_paginado_y_oculta_crear_sin_permiso(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen(['devoluciones.ver']);
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->getJson('/api/devoluciones');

        $respuesta->assertOk()->assertJsonPath('meta.permisos.crear', false)->assertJsonCount(0, 'data');
    }

    public function test_show_incluye_items_pagos_y_venta_origen(): void
    {
        $ctx = $this->prepararTenantConVentaOrigen();
        $this->actingAs($ctx['usuario']);

        $creada = $this->postJson('/api/devoluciones', [
            'venta_id' => $ctx['ventaOrigenId'],
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $ctx['varianteE']->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 120]],
        ])->json('data');

        $respuesta = $this->getJson("/api/devoluciones/{$creada['id']}");

        $respuesta->assertOk()
            ->assertJsonPath('data.venta.cliente_nombre', 'Publico General')
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.variante.producto_nombre', 'Camisa')
            ->assertJsonCount(1, 'data.pagos');
    }
}
