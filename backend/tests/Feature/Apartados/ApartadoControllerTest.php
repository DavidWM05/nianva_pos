<?php

namespace Tests\Feature\Apartados;

use App\Modules\Apartados\Models\Apartado;
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
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApartadoControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, cliente: Cliente,
     *     efectivo: MetodoPago, tarjeta: MetodoPago, variante: ProductoVariante}
     */
    private function prepararTenantConCatalogo(array $permisos = ['apartados.ver', 'apartados.crear', 'apartados.abonar', 'apartados.cancelar']): array
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
        $producto = Producto::create([
            'tenant_id' => $tenant->id, 'categoria_id' => $categoria->id,
            'nombre' => 'Sudadera', 'precio_compra' => 100, 'precio_venta' => 200,
        ]);
        $variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'L']);
        $proveedor = Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Textiles del Norte']);

        app(InventarioService::class)->registrarCompra(
            ['tenant_id' => $tenant->id, 'proveedor_id' => $proveedor->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id],
            [['variante_id' => $variante->id, 'cantidad' => 10, 'precio_compra' => 100]],
        );

        $cliente = Cliente::where('tenant_id', $tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        return compact('tenant', 'sucursal', 'usuario', 'cliente', 'efectivo', 'tarjeta', 'variante');
    }

    public function test_store_crea_apartado_y_reserva_stock(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->actingAs($ctx['usuario']);

        $respuesta = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 2]],
            'fecha_vencimiento' => '2026-08-15',
        ]);

        $respuesta->assertCreated()
            ->assertJsonPath('data.total', '400.00')
            ->assertJsonPath('data.estado', 'activo')
            ->assertJsonPath('data.cliente.nombre', 'Publico General')
            ->assertJsonCount(1, 'data.detalles');
    }

    public function test_store_sin_permiso_devuelve_403(): void
    {
        $ctx = $this->prepararTenantConCatalogo([]);
        $this->actingAs($ctx['usuario']);

        $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 1]],
        ])->assertForbidden();
    }

    public function test_index_lista_paginado_y_oculta_crear_sin_permiso(): void
    {
        $ctx = $this->prepararTenantConCatalogo(['apartados.ver']);
        $this->actingAs($ctx['usuario']);

        Apartado::create([
            'tenant_id' => $ctx['tenant']->id, 'sucursal_id' => $ctx['sucursal']->id,
            'cliente_id' => $ctx['cliente']->id, 'usuario_id' => $ctx['usuario']->id,
            'total' => 200, 'total_abonado' => 50, 'estado' => 'activo',
        ]);

        $respuesta = $this->getJson('/api/v1/apartados');

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.total_abonado', '50.00')
            ->assertJsonPath('meta.permisos.crear', false);
    }

    public function test_registrar_abono_con_pago_mixto_actualiza_total_abonado(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->actingAs($ctx['usuario']);

        $apartado = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 2]],
        ])->json('data');

        $respuesta = $this->postJson("/api/v1/apartados/{$apartado['id']}/abonos", [
            'monto' => 200,
            'pagos' => [
                ['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 150],
                ['metodo_pago_id' => $ctx['tarjeta']->id, 'monto' => 50],
            ],
        ]);

        $respuesta->assertOk()->assertJsonPath('data.total_abonado', '200.00');
    }

    public function test_registrar_abono_que_no_cuadra_devuelve_422_con_error_code(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->actingAs($ctx['usuario']);

        $apartado = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 1]],
        ])->json('data');

        $this->postJson("/api/v1/apartados/{$apartado['id']}/abonos", [
            'monto' => 100,
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 99]],
        ])->assertStatus(422)->assertJsonPath('error_code', 'abono_pago_no_cuadra');
    }

    public function test_liquidar_con_saldo_cubierto_completa_el_apartado(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        app(CajaService::class)->abrirCaja($ctx['sucursal']->id, $ctx['usuario']->id, 0);
        $this->actingAs($ctx['usuario']);

        $apartado = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 1]],
        ])->json('data');

        $this->postJson("/api/v1/apartados/{$apartado['id']}/abonos", [
            'monto' => 200,
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 200]],
        ])->assertOk();

        $respuesta = $this->patchJson("/api/v1/apartados/{$apartado['id']}/liquidar");

        $respuesta->assertOk()->assertJsonPath('data.estado', 'completado');
        $this->assertNotNull($respuesta->json('data.venta_id'));
    }

    public function test_liquidar_con_saldo_insuficiente_devuelve_422_con_error_code(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->actingAs($ctx['usuario']);

        $apartado = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 1]],
        ])->json('data');

        $this->patchJson("/api/v1/apartados/{$apartado['id']}/liquidar")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'apartado_saldo_insuficiente');
    }

    public function test_cancelar_devuelve_abonos_pendientes_en_la_respuesta(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->actingAs($ctx['usuario']);

        $apartado = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 1]],
        ])->json('data');

        $this->postJson("/api/v1/apartados/{$apartado['id']}/abonos", [
            'monto' => 100,
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 100]],
        ])->assertOk();

        $respuesta = $this->patchJson("/api/v1/apartados/{$apartado['id']}/cancelar", ['motivo' => 'Cliente se arrepintio']);

        $respuesta->assertOk()
            ->assertJsonPath('data.estado', 'cancelado')
            ->assertJsonPath('meta.tiene_abonos_pendientes', true)
            ->assertJsonPath('meta.monto_abonado_pendiente', 100);
    }

    public function test_cancelar_sin_permiso_devuelve_403(): void
    {
        $ctx = $this->prepararTenantConCatalogo(['apartados.ver', 'apartados.crear']);
        $this->actingAs($ctx['usuario']);

        $apartado = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 1]],
        ])->json('data');

        $this->patchJson("/api/v1/apartados/{$apartado['id']}/cancelar", ['motivo' => 'x'])->assertForbidden();
    }

    public function test_show_incluye_detalles_y_abonos(): void
    {
        $ctx = $this->prepararTenantConCatalogo();
        $this->actingAs($ctx['usuario']);

        $apartado = $this->postJson('/api/v1/apartados', [
            'cliente_id' => $ctx['cliente']->id,
            'items' => [['variante_id' => $ctx['variante']->id, 'cantidad' => 1]],
        ])->json('data');

        $this->postJson("/api/v1/apartados/{$apartado['id']}/abonos", [
            'monto' => 50,
            'pagos' => [['metodo_pago_id' => $ctx['efectivo']->id, 'monto' => 50]],
        ])->assertOk();

        $respuesta = $this->getJson("/api/v1/apartados/{$apartado['id']}");

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data.detalles')
            ->assertJsonCount(1, 'data.abonos')
            ->assertJsonPath('data.abonos.0.pagos.0.nombre', 'Efectivo')
            ->assertJsonPath('meta.permisos.cancelar', true);
    }
}
