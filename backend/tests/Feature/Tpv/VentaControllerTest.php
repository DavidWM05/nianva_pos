<?php

namespace Tests\Feature\Tpv;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\Categoria;
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
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VentaControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente,
     *     efectivo: MetodoPago, tarjeta: MetodoPago, varianteA: ProductoVariante, varianteB: ProductoVariante}
     */
    private function prepararTenantConCatalogo(array $permisos = ['ventas.ver', 'ventas.crear', 'ventas.anular']): array
    {
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

        app(InventarioService::class)->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [
                ['variante_id' => $varianteA->id, 'cantidad' => 20, 'precio_compra' => 50],
                ['variante_id' => $varianteB->id, 'cantidad' => 10, 'precio_compra' => 25],
            ],
        );

        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'efectivo', 'tarjeta', 'varianteA', 'varianteB');
    }

    public function test_store_registra_venta_con_pago_mixto_y_regla_de_precio(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        ReglaPrecio::create([
            'tenant_id' => $ctx['tenant']->id, 'nombre' => '10% variante A', 'tipo' => 'porcentaje',
            'valor' => 10, 'aplica_a' => 'variante', 'variante_id' => $ctx['varianteA']->id,
        ]);
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);

        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [
                ['variante_id' => $ctx['varianteA']->id, 'cantidad' => 2],
                ['variante_id' => $ctx['varianteB']->id, 'cantidad' => 3],
            ],
            'pagos' => [
                ['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 200],
                ['metodo_pago_id' => $ctx['tarjeta']->id, 'monto' => 130],
            ],
        ]);

        $respuesta->assertCreated()
            ->assertJsonPath('data.total', '330.00')
            ->assertJsonPath('data.cliente.nombre', 'Publico General')
            ->assertJsonCount(2, 'data.metodos_pago')
            ->assertJsonCount(2, 'data.detalles');
    }

    public function test_store_sin_caja_abierta_devuelve_422_con_error_code_caja_no_abierta(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]],
        ]);

        $respuesta->assertStatus(422)->assertJsonPath('error_code', 'caja_no_abierta');
        $this->assertSame(0, Venta::count());
    }

    public function test_store_con_pago_que_no_cuadra_devuelve_422_con_error_code_pago_no_cuadra(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 50]],
        ]);

        $respuesta->assertStatus(422)->assertJsonPath('error_code', 'pago_no_cuadra');
        $this->assertSame(0, Venta::count());
    }

    public function test_store_con_stock_insuficiente_devuelve_422_con_error_code_stock_insuficiente(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 999]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 99900]],
        ]);

        $respuesta->assertStatus(422)->assertJsonPath('error_code', 'stock_insuficiente');
    }

    public function test_store_con_cupon_codigo_invalido_devuelve_422_con_error_code_cupon_invalido(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]],
            'cupon_codigo' => 'NOEXISTE',
        ]);

        $respuesta->assertStatus(422)->assertJsonPath('error_code', 'cupon_invalido');
        $this->assertSame(0, Venta::count());
    }

    public function test_store_sin_permiso_ventas_crear_devuelve_403(): void
    {
        $ctx = $this->prepararTenantConCatalogo([]);
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]],
        ]);

        $respuesta->assertForbidden();
    }

    public function test_index_lista_paginado_con_resumen_de_metodos_de_pago_y_oculta_anular_sin_permiso(): void
    {
        $ctx = $this->prepararTenantConCatalogo(['ventas.ver', 'ventas.crear']);
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [
                ['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 60],
                ['metodo_pago_id' => $ctx['tarjeta']->id, 'monto' => 40],
            ],
        ])->assertCreated();

        $respuesta = $this->getJson('/api/v1/ventas');

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.cliente.nombre', 'Publico General')
            ->assertJsonCount(2, 'data.0.metodos_pago')
            ->assertJsonPath('meta.permisos.anular', false);
    }

    public function test_show_incluye_detalles_y_metodos_de_pago(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $creada = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]],
        ])->json('data');

        $respuesta = $this->getJson("/api/v1/ventas/{$creada['id']}");

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data.detalles')
            ->assertJsonPath('data.detalles.0.variante.producto_nombre', 'Playera');
    }

    public function test_anular_marca_estado_y_exige_motivo(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $creada = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]],
        ])->json('data');

        $this->patchJson("/api/v1/ventas/{$creada['id']}/anular", [])
            ->assertStatus(422);

        $respuesta = $this->patchJson("/api/v1/ventas/{$creada['id']}/anular", ['motivo' => 'Cliente se arrepintio']);

        $respuesta->assertOk()
            ->assertJsonPath('data.estado', 'anulada')
            ->assertJsonPath('data.motivo_anulacion', 'Cliente se arrepintio');
    }

    public function test_anular_sin_permiso_devuelve_403(): void
    {
        $ctx = $this->prepararTenantConCatalogo(['ventas.ver', 'ventas.crear']);
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 500);
        $this->actingAs($ctx['usuario']);

        $creada = $this->postJson('/api/v1/ventas', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]],
        ])->json('data');

        $this->patchJson("/api/v1/ventas/{$creada['id']}/anular", ['motivo' => 'x'])->assertForbidden();
    }

    public function test_cotizar_resuelve_precio_con_regla_sin_registrar_nada(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        ReglaPrecio::create([
            'tenant_id' => $ctx['tenant']->id, 'nombre' => '10% variante A', 'tipo' => 'porcentaje',
            'valor' => 10, 'aplica_a' => 'variante', 'variante_id' => $ctx['varianteA']->id,
        ]);
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/ventas/cotizar', [
            'items' => [['variante_id' => $ctx['varianteA']->id, 'cantidad' => 2]],
        ]);

        $respuesta->assertOk()
            ->assertJsonPath('data.subtotal', 180)
            ->assertJsonPath('data.items.0.descuento_aplicado', 20);

        $this->assertSame(0, Venta::count());
    }
}
